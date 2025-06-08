// Sample movie database
/*const movies = [
    { title: "The Shawshank Redemption", genres: ["Drama"], rating: 9.3 },
    { title: "The Godfather", genres: ["Crime", "Drama"], rating: 9.2 },
    { title: "The Dark Knight", genres: ["Action", "Crime", "Drama", "Thriller"], rating: 9.0 },
    { title: "Pulp Fiction", genres: ["Crime", "Drama"], rating: 8.9 },
    { title: "Inception", genres: ["Action", "Adventure", "Sci-Fi", "Thriller"], rating: 8.8 },
    { title: "The Matrix", genres: ["Action", "Sci-Fi"], rating: 8.7 },
    { title: "Forrest Gump", genres: ["Drama", "Romance"], rating: 8.8 },
    { title: "The Silence of the Lambs", genres: ["Crime", "Drama", "Thriller", "Horror"], rating: 8.6 },
    { title: "Interstellar", genres: ["Adventure", "Drama", "Sci-Fi"], rating: 8.6 },
    { title: "The Lord of the Rings", genres: ["Action", "Adventure", "Drama", "Fantasy"], rating: 8.8 }
];*/

const TMDB_API_KEY = '1e6c49b4cc57e66a33167920ed6ce4cb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_BASE_URL = 'http://localhost:8000/api';
const USER_ID = 'user1'; // In a real app, this would come from authentication

// Cache for genre data
let genreCache = null;
let currentPage = 1;
let currentSearchType = null;
let currentSearchParams = null;
let currentMovies = [];

async function getGenres() {
    if (genreCache) return genreCache;
    
    try {
        const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        genreCache = data.genres;
        return genreCache;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
}

async function searchSimilarMovies() {
    const searchInput = document.getElementById('movieSearch');
    const movieTitle = searchInput.value.trim();
    
    if (!movieTitle) {
        alert('Please enter a movie title');
        return;
    }

    currentPage = 1;
    currentSearchType = 'similar';
    
    try {
        // First, search for the movie to get its ID
        const searchResponse = await fetch(
            `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}&page=1`
        );
        const searchData = await searchResponse.json();
        
        if (searchData.results.length === 0) {
            document.getElementById('movieResults').innerHTML = '<p>No movies found matching your search. Please try a different title.</p>';
            return;
        }

        // Get the first movie's ID
        const movieId = searchData.results[0].id;
        currentSearchParams = { movieId };
        
        // Get similar movies
        const similarResponse = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&page=${currentPage}&include_adult=false&certification_country=US`
        );
        const similarData = await similarResponse.json();
        
        displayMovies(similarData.results);
        updateLoadMoreButton(similarData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('movieResults').innerHTML = `<p>Error: ${error.message}. Please try again later.</p>`;
    }
}

async function findMovies() {
    const selectedGenres = Array.from(document.querySelectorAll('.genre-btn.selected'))
        .map(button => button.textContent);
    
    if (selectedGenres.length === 0) {
        document.getElementById('movieResults').innerHTML = '<p>Please select at least one genre!</p>';
        return;
    }

    currentPage = 1;
    currentSearchType = 'genres';
    
    try {
        const genres = await getGenres();
        
        const selectedGenreIds = selectedGenres.map(genre => {
            const foundGenre = genres.find(g => g.name.toLowerCase() === genre.toLowerCase());
            if (!foundGenre) {
                console.warn(`Genre not found: ${genre}`);
            }
            return foundGenre ? foundGenre.id : null;
        }).filter(id => id !== null);

        if (selectedGenreIds.length === 0) {
            document.getElementById('movieResults').innerHTML = '<p>No matching genres found in the database. Please try different genres.</p>';
            return;
        }

        currentSearchParams = { genreIds: selectedGenreIds };
        
        const moviesResponse = await fetch(
            `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${selectedGenreIds.join(',')}&sort_by=vote_average.desc&vote_count.gte=1000&language=en-US&page=${currentPage}&include_adult=false&certification_country=US`
        );
        
        if (!moviesResponse.ok) {
            throw new Error(`HTTP error! status: ${moviesResponse.status}`);
        }
        
        const moviesData = await moviesResponse.json();
        displayMovies(moviesData.results);
        updateLoadMoreButton(moviesData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('movieResults').innerHTML = `<p>Error: ${error.message}. Please try again later.</p>`;
    }
}

async function loadMoreMovies() {
    if (!currentSearchType || !currentSearchParams) return;
    
    currentPage++;
    const resultsDiv = document.getElementById('movieResults');
    
    try {
        let response;
        if (currentSearchType === 'similar') {
            response = await fetch(
                `${TMDB_BASE_URL}/movie/${currentSearchParams.movieId}/similar?api_key=${TMDB_API_KEY}&page=${currentPage}&include_adult=false&certification_country=US`
            );
        } else {
            response = await fetch(
                `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${currentSearchParams.genreIds.join(',')}&sort_by=vote_average.desc&vote_count.gte=1000&language=en-US&page=${currentPage}&include_adult=false&certification_country=US`
            );
        }
        
        const data = await response.json();
        displayMovies(data.results, true);
        updateLoadMoreButton(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading more movies. Please try again.');
    }
}

async function getMovieCertification(movieId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/release_dates?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        const usRelease = data.results.find(release => release.iso_3166_1 === 'US');
        if (usRelease && usRelease.release_dates.length > 0) {
            return usRelease.release_dates[0].certification;
        }
        return 'Not Rated';
    } catch (error) {
        console.error('Error fetching certification:', error);
        return 'Not Rated';
    }
}

async function getStreamingInfo(movieId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        
        // Get US streaming providers
        const usProviders = data.results?.US?.flatrate || [];
        const usRent = data.results?.US?.rent || [];
        const usBuy = data.results?.US?.buy || [];
        
        return {
            stream: usProviders.map(p => ({
                name: p.provider_name,
                logo: p.logo_path,
                type: 'stream'
            })),
            rent: usRent.map(p => ({
                name: p.provider_name,
                logo: p.logo_path,
                type: 'rent'
            })),
            buy: usBuy.map(p => ({
                name: p.provider_name,
                logo: p.logo_path,
                type: 'buy'
            }))
        };
    } catch (error) {
        console.error('Error fetching streaming info:', error);
        return { stream: [], rent: [], buy: [] };
    }
}

async function getTrailerUrl(movieId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        const trailer = data.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
        );
        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    } catch (error) {
        console.error('Error fetching trailer:', error);
        return null;
    }
}

function createProviderHTML(providers) {
    if (!providers || providers.length === 0) return '';
    
    return `
        <div class="providers-section">
            ${providers.stream.length > 0 ? `
                <div class="provider-group">
                    <h4>Streaming On:</h4>
                    <div class="provider-list">
                        ${providers.stream.map(p => `
                            <div class="provider-item">
                                <img src="https://image.tmdb.org/t/p/w45${p.logo}" alt="${p.name}" title="${p.name}">
                                <span>${p.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${providers.rent.length > 0 ? `
                <div class="provider-group">
                    <h4>Rent On:</h4>
                    <div class="provider-list">
                        ${providers.rent.map(p => `
                            <div class="provider-item">
                                <img src="https://image.tmdb.org/t/p/w45${p.logo}" alt="${p.name}" title="${p.name}">
                                <span>${p.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${providers.buy.length > 0 ? `
                <div class="provider-group">
                    <h4>Buy On:</h4>
                    <div class="provider-list">
                        ${providers.buy.map(p => `
                            <div class="provider-item">
                                <img src="https://image.tmdb.org/t/p/w45${p.logo}" alt="${p.name}" title="${p.name}">
                                <span>${p.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

async function displayMovies(movies, append = false) {
    const resultsDiv = document.getElementById('movieResults');
    if (!append) {
        resultsDiv.innerHTML = '';
        currentMovies = movies; // Store the current movies
    } else {
        currentMovies = [...currentMovies, ...movies]; // Append new movies to the list
    }

    if (movies.length === 0) {
        resultsDiv.innerHTML = '<p>No movies found matching your criteria.</p>';
        return;
    }

    for (const movie of movies) {
        const movieElement = await createMovieElement(movie);
        resultsDiv.appendChild(movieElement);
    }
}

function updateLoadMoreButton(data) {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    loadMoreBtn.style.display = data.page < data.total_pages ? 'block' : 'none';
}

function toggleGenre(button) {
    button.classList.toggle('selected');
}

// Remove the profile button code
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
        if (savedProfile) {
            const userProfile = JSON.parse(savedProfile);
            if (userProfile.favoriteGenres && userProfile.favoriteGenres.length > 0) {
                // Select favorite genres in the UI
                const genreButtons = document.querySelectorAll('.genre-btn');
                genreButtons.forEach(button => {
                    if (userProfile.favoriteGenres.includes(button.textContent)) {
                        button.classList.add('selected');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading favorite genres:', error);
    }
});

// Make addToWatchHistory available globally
window.addToWatchHistory = async function(movie) {
    try {
        // Get current profile from localStorage
        const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
        let userProfile = savedProfile ? JSON.parse(savedProfile) : { watchHistory: [] };
        
        if (!userProfile.watchHistory) {
            userProfile.watchHistory = [];
        }
        
        // Get additional movie information
        const certification = await getMovieCertification(movie.id);
        const streamingInfo = await getStreamingInfo(movie.id);
        
        // Check if movie already exists in history
        const existingIndex = userProfile.watchHistory.findIndex(m => m.id === movie.id);
        if (existingIndex !== -1) {
            // Update existing entry
            userProfile.watchHistory[existingIndex] = {
                ...userProfile.watchHistory[existingIndex],
                watchedDate: new Date().toISOString(),
                rating: movie.vote_average,
                ageRating: certification,
                streamingInfo: streamingInfo
            };
        } else {
            // Add new entry with all information
            userProfile.watchHistory.unshift({
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                overview: movie.overview,
                release_date: movie.release_date,
                vote_average: movie.vote_average,
                genres: movie.genre_ids ? movie.genre_ids.map(id => {
                    const genre = genreCache.find(g => g.id === id);
                    return genre ? genre.name : null;
                }).filter(Boolean) : [],
                watchedDate: new Date().toISOString(),
                type: 'movie',
                ageRating: certification,
                streamingInfo: streamingInfo
            });
        }
        
        // Keep only last 20 movies
        if (userProfile.watchHistory.length > 20) {
            userProfile.watchHistory = userProfile.watchHistory.slice(0, 20);
        }
        
        // Save to localStorage
        localStorage.setItem(`userProfile_${USER_ID}`, JSON.stringify(userProfile));
        
        alert('Added to watch history!');
    } catch (error) {
        console.error('Error adding to watch history:', error);
        alert('Error adding to watch history. Please try again.');
    }
};

// Add toggleDropdown function to window scope
window.toggleDropdown = function(button) {
    const content = button.nextElementSibling;
    const arrow = button.querySelector('.dropdown-arrow');
    
    if (content.style.display === 'block') {
        content.style.display = 'none';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'block';
        arrow.textContent = '▲';
    }
};

async function createMovieElement(movie) {
    const element = document.createElement('div');
    element.className = 'result-item';
    
    const certification = await getMovieCertification(movie.id);
    const streamingInfo = await getStreamingInfo(movie.id);
    const trailerUrl = await getTrailerUrl(movie.id);
    
    element.innerHTML = `
        <div class="movie-content">
            <div class="movie-header">
                <h3>${movie.title}</h3>
                ${trailerUrl ? `
                    <button class="trailer-btn" onclick="window.open('${trailerUrl}', '_blank')">
                        <span class="trailer-icon">▶</span>
                        Watch Trailer
                    </button>
                ` : ''}
            </div>
            <p>Release Date: ${movie.release_date || 'Unknown'}</p>
            <p>Rating: ${(movie.vote_average / 2).toFixed(1)}/5</p>
            <p>Age Rating: ${certification}</p>
            
            <div class="dropdown-section">
                <button class="dropdown-btn" onclick="toggleDropdown(this)">
                    Overview <span class="dropdown-arrow">▼</span>
                </button>
                <div class="dropdown-content">
                    <p>${movie.overview || 'No overview available.'}</p>
                </div>
            </div>

            <div class="dropdown-section">
                <button class="dropdown-btn" onclick="toggleDropdown(this)">
                    Where to Watch <span class="dropdown-arrow">▼</span>
                </button>
                <div class="dropdown-content">
                    ${createProviderHTML(streamingInfo)}
                </div>
            </div>

            <div class="movie-actions">
                <button onclick="addToWatchHistory(${JSON.stringify(movie).replace(/"/g, '&quot;')})" class="choice-btn">Add to Watch History</button>
                <button onclick="addToWatchlist('movie', ${JSON.stringify(movie).replace(/"/g, '&quot;')})" class="watchlist-btn">Add to Watchlist</button>
                <button onclick="surpriseMe(${JSON.stringify(movie).replace(/"/g, '&quot;')})" class="surprise-btn">Surprise Me</button>
            </div>
        </div>
        ${movie.poster_path ? `<img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title} poster">` : ''}
    `;
    
    return element;
}

function surpriseMe(currentMovie) {
    if (currentMovies.length <= 1) {
        alert('Need more movies to surprise you! Try searching for more movies.');
        return;
    }

    // Filter out the current movie and get a random one
    const otherMovies = currentMovies.filter(movie => movie.id !== currentMovie.id);
    const randomIndex = Math.floor(Math.random() * otherMovies.length);
    const surpriseMovie = otherMovies[randomIndex];

    // Create a modal to display the surprise movie
    const modal = document.createElement('div');
    modal.className = 'surprise-modal';
    
    const year = surpriseMovie.release_date ? surpriseMovie.release_date.split('-')[0] : '';
    
    modal.innerHTML = `
        <div class="surprise-content">
            <h2>🎉 Your Surprise Movie! 🎉</h2>
            <h3>${surpriseMovie.title} ${year ? `(${year})` : ''}</h3>
            <p>${surpriseMovie.overview || 'No description available'}</p>
            <div class="surprise-details">
                <span class="rating">⭐ ${surpriseMovie.vote_average?.toFixed(1) || 'N/A'}</span>
                <span class="genres">${surpriseMovie.genres?.join(', ') || 'No genres'}</span>
            </div>
            <div class="surprise-actions">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-btn">Close</button>
                <button onclick="addToWatchlist('movie', ${JSON.stringify(surpriseMovie).replace(/"/g, '&quot;')})" class="watchlist-btn">Add to Watchlist</button>
                <button onclick="surpriseMe(${JSON.stringify(surpriseMovie).replace(/"/g, '&quot;')})" class="surprise-btn">Try Another Surprise</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function addToWatchlist(type, item) {
    const watchlist = JSON.parse(localStorage.getItem(type + 'Watchlist')) || [];
    
    // Check if item is already in watchlist
    if (watchlist.some(existingItem => existingItem.id === item.id)) {
        alert('This item is already in your watchlist!');
        return;
    }
    
    // Add to watchlist
    watchlist.push(item);
    localStorage.setItem(type + 'Watchlist', JSON.stringify(watchlist));
    alert('Added to watchlist!');
} 