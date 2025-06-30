import { auth, db } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { supabase } from './supabase-config.js';

const USER_ID = 'user1'; // In a real app, this would come from authentication
let currentMovieFilter = 'all';
let currentShowFilter = 'all';

// TMDB API configuration
const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Load watchlist when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, calling loadWatchlist...');
    loadWatchlist();
});

// Function to show/hide tabs
function showTab(tab) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tab + 'Tab').classList.add('active');
    
    // Add active class to selected tab button
    event.target.classList.add('active');
}

function filterWatchlist(filter, type) {
    // Update current filter
    if (type === 'movie') {
        currentMovieFilter = filter;
    } else {
        currentShowFilter = filter;
    }

    // Update active filter button
    const filterSection = event.target.parentElement;
    filterSection.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Reload watchlist with new filter
    loadWatchlist();
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

async function loadWatchlist() {
    try {
        console.log('Loading watchlist...');
        const movieWatchlist = JSON.parse(localStorage.getItem('movieWatchlist')) || [];
        const showWatchlist = JSON.parse(localStorage.getItem('showWatchlist')) || [];
        
        console.log('Movie watchlist:', movieWatchlist);
        console.log('Show watchlist:', showWatchlist);

        // Apply filters
        const filteredMovies = filterItems(movieWatchlist, currentMovieFilter);
        const filteredShows = filterItems(showWatchlist, currentShowFilter);

        // Display watchlist immediately without fetching ratings
        displayWatchlist(filteredMovies, filteredShows);

        // Then fetch ratings in the background
        try {
            // Fetch age ratings for movies
            const moviesWithRatings = await Promise.all(filteredMovies.map(async (movie) => {
                try {
                    const ratingResponse = await fetch(
                        `${TMDB_BASE_URL}/movie/${movie.id}/release_dates?api_key=${TMDB_API_KEY}`
                    );
                    const ratingData = await ratingResponse.json();
                    const usRating = ratingData.results.find(r => r.iso_3166_1 === 'US');
                    movie.ageRating = usRating?.release_dates[0]?.certification || 'Not Rated';
                    return movie;
                } catch (error) {
                    console.error('Error fetching movie rating:', error);
                    movie.ageRating = 'Not Rated';
                    return movie;
                }
            }));

            // Fetch age ratings for shows
            const showsWithRatings = await Promise.all(filteredShows.map(async (show) => {
                try {
                    const ratingResponse = await fetch(
                        `${TMDB_BASE_URL}/tv/${show.id}/content_ratings?api_key=${TMDB_API_KEY}`
                    );
                    const ratingData = await ratingResponse.json();
                    const usRating = ratingData.results.find(r => r.iso_3166_1 === 'US');
                    show.ageRating = usRating?.rating || 'Not Rated';
                    return show;
                } catch (error) {
                    console.error('Error fetching show rating:', error);
                    show.ageRating = 'Not Rated';
                    return show;
                }
            }));

            // Update display with ratings
            displayWatchlist(moviesWithRatings, showsWithRatings);
        } catch (error) {
            console.error('Error fetching ratings:', error);
            // If rating fetch fails, we still have the basic display
        }
    } catch (error) {
        console.error('Error loading watchlist:', error);
        const movieContainer = document.getElementById('movieWatchlist');
        const showContainer = document.getElementById('showWatchlist');
        if (movieContainer) movieContainer.innerHTML = '<p class="error">Error loading watchlist. Please try again later.</p>';
        if (showContainer) showContainer.innerHTML = '<p class="error">Error loading watchlist. Please try again later.</p>';
    }
}

function displayWatchlist(movies, shows) {
    console.log('Displaying watchlist...');
    console.log('Movies:', movies);
    console.log('Shows:', shows);

    const movieContainer = document.getElementById('movieWatchlist');
    const showContainer = document.getElementById('showWatchlist');

    if (!movieContainer || !showContainer) {
        console.error('Could not find watchlist containers');
        return;
    }

    try {
        if (!movies || movies.length === 0) {
            movieContainer.innerHTML = '<p class="no-results">No movies in watchlist.</p>';
        } else {
            movieContainer.innerHTML = movies.map((movie, index) => `
                <div class="watch-history-item" onclick="toggleDetails('movie', ${index})">
                    <div class="watch-history-header">
                        <div class="watch-history-title">
                            <span class="type-badge movie">Movie</span>
                            <h3>${movie.title || 'Unknown Title'}</h3>
                        </div>
                        <div class="watch-history-actions">
                            <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${movie.id}, 'movie')">
                                <span class="trailer-icon">▶</span>
                                Watch Trailer
                            </button>
                            <button class="remove-btn" onclick="event.stopPropagation(); removeFromWatchlist('movie', ${movie.id})">
                                <span class="remove-icon">×</span>
                                Remove
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
                                        <h2>${movie.title || 'Unknown Title'}</h2>
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
                                <button class="choice-btn" onclick="event.stopPropagation(); markAsWatched('movie', ${movie.id})">Mark as Watched</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (!shows || shows.length === 0) {
            showContainer.innerHTML = '<p class="no-results">No shows in watchlist.</p>';
        } else {
            showContainer.innerHTML = shows.map((show, index) => `
                <div class="watch-history-item" onclick="toggleDetails('show', ${index})">
                    <div class="watch-history-header">
                        <div class="watch-history-title">
                            <span class="type-badge show">TV Show</span>
                            <h3>${show.name || 'Unknown Title'}</h3>
                        </div>
                        <div class="watch-history-actions">
                            <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${show.id}, 'show')">
                                <span class="trailer-icon">▶</span>
                                Watch Trailer
                            </button>
                            <button class="remove-btn" onclick="event.stopPropagation(); removeFromWatchlist('show', ${show.id})">
                                <span class="remove-icon">×</span>
                                Remove
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
                                        <h2>${show.name || 'Unknown Title'}</h2>
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
                                <button class="choice-btn" onclick="event.stopPropagation(); markAsWatched('show', ${show.id})">Mark as Watched</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error displaying watchlist:', error);
        movieContainer.innerHTML = '<p class="error">Error displaying watchlist. Please try again later.</p>';
        showContainer.innerHTML = '<p class="error">Error displaying watchlist. Please try again later.</p>';
    }
}

function toggleDetails(type, index) {
    const detailsElement = document.getElementById(`${type}-details-${index}`);
    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
    } else {
        detailsElement.style.display = 'none';
    }
}

function removeFromWatchlist(type, id) {
    if (confirm('Are you sure you want to remove this item from your watchlist?')) {
        const watchlist = JSON.parse(localStorage.getItem(type + 'Watchlist')) || [];
        const updatedWatchlist = watchlist.filter(item => item.id !== id);
        localStorage.setItem(type + 'Watchlist', JSON.stringify(updatedWatchlist));
        displayWatchlist();
    }
}

function markAsWatched(type, id) {
    if (confirm('Mark this item as watched?')) {
        // Remove from watchlist
        const watchlist = JSON.parse(localStorage.getItem(type + 'Watchlist')) || [];
        const item = watchlist.find(item => item.id === id);
        if (item) {
            // Add to watched history
            const watchedHistory = JSON.parse(localStorage.getItem('watchedHistory')) || [];
            watchedHistory.push({
                ...item,
                watchedDate: new Date().toISOString()
            });
            localStorage.setItem('watchedHistory', JSON.stringify(watchedHistory));
            
            // Remove from watchlist
            removeFromWatchlist(type, id);
        }
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

        // Get existing watchlist
        const watchlistKey = type === 'movie' ? 'movieWatchlist' : 'showWatchlist';
        const watchlist = JSON.parse(localStorage.getItem(watchlistKey)) || [];
        
        // Check if item is already in watchlist
        if (!watchlist.some(existingItem => existingItem.id === item.id)) {
            // Add to watchlist
            watchlist.push(item);
            localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
            alert('Added to watchlist!');
            
            // Reload watchlist display
            loadWatchlist();
        } else {
            alert('This item is already in your watchlist.');
        }
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        alert('Error adding to watchlist. Please try again.');
    }
}

async function findSimilarShows(showId) {
    try {
        // Get the original show's details first to get its genres
        const showDetailsResponse = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const showDetails = await showDetailsResponse.json();
        const originalGenres = showDetails.genres.map(g => g.id);

        // Fetch recommendations
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            return [];
        }

        // Score and sort recommendations based on genre overlap and popularity
        const scoredShows = data.results.map(show => {
            const genreOverlap = show.genre_ids.filter(id => originalGenres.includes(id)).length;
            const score = (genreOverlap * 2) + (show.vote_average || 0) + (show.popularity / 100);
            return { ...show, score };
        });

        // Sort by score and get top 5
        const topShows = scoredShows
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        // Fetch additional details for each show
        const showsWithDetails = await Promise.all(topShows.map(async (show) => {
            try {
                const detailsResponse = await fetch(
                    `${TMDB_BASE_URL}/tv/${show.id}?api_key=${TMDB_API_KEY}&language=en-US`
                );
                const details = await detailsResponse.json();
                
                // Get age rating
                const ratingResponse = await fetch(
                    `${TMDB_BASE_URL}/tv/${show.id}/content_ratings?api_key=${TMDB_API_KEY}`
                );
                const ratingData = await ratingResponse.json();
                const usRating = ratingData.results.find(r => r.iso_3166_1 === 'US');
                
                return {
                    ...show,
                    ageRating: usRating?.rating || 'Not Rated',
                    genres: details.genres || [],
                    overview: details.overview || show.overview
                };
            } catch (error) {
                console.error('Error fetching show details:', error);
                return show;
            }
        }));

        console.log('Found recommended shows:', showsWithDetails);
        return showsWithDetails;
    } catch (error) {
        console.error('Error finding recommended shows:', error);
        return [];
    }
}

// Get user's watchlist from Supabase
async function getWatchlist() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (localStorage.getItem('currentUser') === 'Guest') {
            return JSON.parse(localStorage.getItem('guestWatchlist')) || [];
        }
        window.location.href = 'login.html';
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('watchlist')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;
        return data.watchlist || [];
    } catch (error) {
        console.error("Error getting watchlist:", error);
        return [];
    }
}

// Add show to watchlist
async function addToWatchlist(show) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (localStorage.getItem('currentUser') === 'Guest') {
            const guestWatchlist = JSON.parse(localStorage.getItem('guestWatchlist')) || [];
            guestWatchlist.push(show);
            localStorage.setItem('guestWatchlist', JSON.stringify(guestWatchlist));
            return;
        }
        window.location.href = 'login.html';
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                watchlist: supabase.sql`array_append(watchlist, ${show})`
            })
            .eq('id', session.user.id);

        if (error) throw error;
    } catch (error) {
        console.error("Error adding to watchlist:", error);
    }
}

// Remove show from watchlist
async function removeFromWatchlist(showId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (localStorage.getItem('currentUser') === 'Guest') {
            const guestWatchlist = JSON.parse(localStorage.getItem('guestWatchlist')) || [];
            const updatedWatchlist = guestWatchlist.filter(show => show.id !== showId);
            localStorage.setItem('guestWatchlist', JSON.stringify(updatedWatchlist));
            return;
        }
        window.location.href = 'login.html';
        return;
    }

    try {
        // First get the current watchlist
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('watchlist')
            .eq('id', session.user.id)
            .single();

        if (fetchError) throw fetchError;

        // Remove the show from the array
        const updatedWatchlist = data.watchlist.filter(show => show.id !== showId);

        // Update the watchlist
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ watchlist: updatedWatchlist })
            .eq('id', session.user.id);

        if (updateError) throw updateError;
    } catch (error) {
        console.error("Error removing from watchlist:", error);
    }
}

function filterItems(items, filter) {
    switch (filter) {
        case 'recent':
            return [...items].sort((a, b) => {
                const dateA = new Date(a.addedDate || 0);
                const dateB = new Date(b.addedDate || 0);
                return dateB - dateA;
            });
        case 'rating':
            return [...items].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        default:
            return items;
    }
} 