// TMDB API configuration
const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Load trending content when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTrendingContent();
});

// Function to show/hide tabs
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content and activate its button
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

async function loadTrendingContent() {
    try {
        // Fetch trending movies
        const moviesResponse = await fetch(
            `${TMDB_BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`
        );
        const moviesData = await moviesResponse.json();
        
        // Fetch age ratings for movies
        const moviesWithRatings = await Promise.all(moviesData.results.map(async (movie) => {
            const ratingResponse = await fetch(
                `${TMDB_BASE_URL}/movie/${movie.id}/release_dates?api_key=${TMDB_API_KEY}`
            );
            const ratingData = await ratingResponse.json();
            const usRating = ratingData.results.find(r => r.iso_3166_1 === 'US');
            movie.ageRating = usRating?.release_dates[0]?.certification || 'Not Rated';
            return movie;
        }));
        
        displayTrendingMovies(moviesWithRatings);

        // Fetch trending TV shows
        const showsResponse = await fetch(
            `${TMDB_BASE_URL}/trending/tv/day?api_key=${TMDB_API_KEY}`
        );
        const showsData = await showsResponse.json();
        
        // Fetch age ratings for shows
        const showsWithRatings = await Promise.all(showsData.results.map(async (show) => {
            const ratingResponse = await fetch(
                `${TMDB_BASE_URL}/tv/${show.id}/content_ratings?api_key=${TMDB_API_KEY}`
            );
            const ratingData = await ratingResponse.json();
            const usRating = ratingData.results.find(r => r.iso_3166_1 === 'US');
            show.ageRating = usRating?.rating || 'Not Rated';
            return show;
        }));
        
        displayTrendingShows(showsWithRatings);
    } catch (error) {
        console.error('Error loading trending content:', error);
        document.getElementById('trendingMovies').innerHTML = '<p class="error">Error loading trending content. Please try again later.</p>';
        document.getElementById('trendingShows').innerHTML = '<p class="error">Error loading trending content. Please try again later.</p>';
    }
}

function displayTrendingMovies(movies) {
    const container = document.getElementById('trendingMovies');
    
    if (!movies || movies.length === 0) {
        container.innerHTML = '<p class="no-results">No trending movies found.</p>';
        return;
    }

    container.innerHTML = movies.map((movie, index) => `
        <div class="watch-history-item" onclick="toggleDetails('movie', ${index})">
            <div class="watch-history-header">
                <div class="watch-history-title">
                    <span class="type-badge movie">Movie</span>
                    <h3>${movie.title}</h3>
                </div>
                <div class="watch-history-actions">
                    <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${movie.id}, 'movie')">
                        <span class="trailer-icon">▶</span>
                        Watch Trailer
                    </button>
                </div>
            </div>
            <div class="watch-history-details" id="movie-details-${index}" style="display: none;">
                <div class="details-content">
                    <div class="details-grid">
                        <div class="poster-section">
                            ${movie.poster_path ? 
                                `<img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title} poster" class="poster-image">` :
                                `<div class="no-poster">No Image Available</div>`
                            }
                        </div>
                        <div class="info-section">
                            <div class="info-header">
                                <h2>${movie.title}</h2>
                                ${movie.release_date ? `<p class="release-date">Released: ${new Date(movie.release_date).toLocaleDateString()}</p>` : ''}
                            </div>
                            
                            <div class="ratings-section">
                                ${movie.vote_average ? `
                                    <div class="rating-item">
                                        <span class="rating-label">TMDB Rating:</span>
                                        <span class="rating-value">${movie.vote_average.toFixed(1)}/10</span>
                                    </div>
                                ` : ''}
                                ${movie.ageRating ? `
                                    <div class="rating-item">
                                        <span class="rating-label">Age Rating:</span>
                                        <span class="rating-value age-rating">${movie.ageRating}</span>
                                    </div>
                                ` : ''}
                            </div>

                            ${movie.overview ? `
                                <div class="overview-section">
                                    <h3>Overview</h3>
                                    <p>${movie.overview}</p>
                                </div>
                            ` : ''}

                            ${movie.genre_ids ? `
                                <div class="genres-section">
                                    <h3>Genres</h3>
                                    <div class="genre-tags">
                                        ${getGenreNames(movie.genre_ids, 'movie').map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="choice-btn" onclick="event.stopPropagation(); addToWatchlist('movie', ${movie.id})">Add to Watchlist</button>
                        <button class="choice-btn" onclick="event.stopPropagation(); markAsWatched('movie', ${movie.id})">Mark as Watched</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function displayTrendingShows(shows) {
    const container = document.getElementById('trendingShows');
    
    if (!shows || shows.length === 0) {
        container.innerHTML = '<p class="no-results">No trending shows found.</p>';
        return;
    }

    container.innerHTML = shows.map((show, index) => `
        <div class="watch-history-item" onclick="toggleDetails('show', ${index})">
            <div class="watch-history-header">
                <div class="watch-history-title">
                    <span class="type-badge show">TV Show</span>
                    <h3>${show.name}</h3>
                </div>
                <div class="watch-history-actions">
                    <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${show.id}, 'show')">
                        <span class="trailer-icon">▶</span>
                        Watch Trailer
                    </button>
                </div>
            </div>
            <div class="watch-history-details" id="show-details-${index}" style="display: none;">
                <div class="details-content">
                    <div class="details-grid">
                        <div class="poster-section">
                            ${show.poster_path ? 
                                `<img src="https://image.tmdb.org/t/p/w500${show.poster_path}" alt="${show.name} poster" class="poster-image">` :
                                `<div class="no-poster">No Image Available</div>`
                            }
                        </div>
                        <div class="info-section">
                            <div class="info-header">
                                <h2>${show.name}</h2>
                                ${show.first_air_date ? `<p class="release-date">First Aired: ${new Date(show.first_air_date).toLocaleDateString()}</p>` : ''}
                            </div>
                            
                            <div class="ratings-section">
                                ${show.vote_average ? `
                                    <div class="rating-item">
                                        <span class="rating-label">TMDB Rating:</span>
                                        <span class="rating-value">${show.vote_average.toFixed(1)}/10</span>
                                    </div>
                                ` : ''}
                                ${show.ageRating ? `
                                    <div class="rating-item">
                                        <span class="rating-label">Age Rating:</span>
                                        <span class="rating-value age-rating">${show.ageRating}</span>
                                    </div>
                                ` : ''}
                            </div>

                            ${show.overview ? `
                                <div class="overview-section">
                                    <h3>Overview</h3>
                                    <p>${show.overview}</p>
                                </div>
                            ` : ''}

                            ${show.genre_ids ? `
                                <div class="genres-section">
                                    <h3>Genres</h3>
                                    <div class="genre-tags">
                                        ${getGenreNames(show.genre_ids, 'tv').map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="choice-btn" onclick="event.stopPropagation(); addToWatchlist('show', ${show.id})">Add to Watchlist</button>
                        <button class="choice-btn" onclick="event.stopPropagation(); markAsWatched('show', ${show.id})">Mark as Watched</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleDetails(type, index) {
    const detailsElement = document.getElementById(`${type}-details-${index}`);
    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
    } else {
        detailsElement.style.display = 'none';
    }
}

async function getTrailerUrl(id, type) {
    try {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const response = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${id}/videos?api_key=${TMDB_API_KEY}`
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

async function watchTrailer(id, type) {
    try {
        const trailerUrl = await getTrailerUrl(id, type);
        if (trailerUrl) {
            window.open(trailerUrl, '_blank');
        } else {
            alert('No trailer available for this title.');
        }
    } catch (error) {
        console.error('Error watching trailer:', error);
        alert('Error loading trailer. Please try again.');
    }
}

async function addToWatchlist(type, id) {
    try {
        // Fetch full details of the movie/show
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const response = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}`
        );
        const item = await response.json();

        // Add to watchlist
        const watchlist = JSON.parse(localStorage.getItem(type + 'Watchlist')) || [];
        if (!watchlist.some(existingItem => existingItem.id === item.id)) {
            watchlist.push(item);
            localStorage.setItem(type + 'Watchlist', JSON.stringify(watchlist));
            alert('Added to watchlist!');
        } else {
            alert('This item is already in your watchlist.');
        }
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        alert('Error adding to watchlist. Please try again.');
    }
}

function markAsWatched(type, id) {
    if (confirm('Mark this item as watched?')) {
        try {
            // Add to watched history
            const watchedHistory = JSON.parse(localStorage.getItem('watchedHistory')) || [];
            const item = {
                id: id,
                type: type,
                watchedDate: new Date().toISOString()
            };
            watchedHistory.push(item);
            localStorage.setItem('watchedHistory', JSON.stringify(watchedHistory));
            alert('Marked as watched!');
        } catch (error) {
            console.error('Error marking as watched:', error);
            alert('Error marking as watched. Please try again.');
        }
    }
}

// Genre mapping
const movieGenres = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

const tvGenres = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics'
};

function getGenreNames(genreIds, type) {
    const genreMap = type === 'movie' ? movieGenres : tvGenres;
    return genreIds.map(id => genreMap[id] || 'Unknown');
} 