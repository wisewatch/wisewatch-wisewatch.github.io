const USER_ID = 'user1'; // In a real app, this would come from authentication
let currentFilter = 'all';

// TMDB API configuration
const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Load watchlist when page loads
document.addEventListener('DOMContentLoaded', () => {
    displayWatchlist();
});

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

async function displayWatchlist() {
    // Load movies
    const movieWatchlist = JSON.parse(localStorage.getItem('movieWatchlist')) || [];
    const movieContainer = document.getElementById('movieWatchlist');
    
    if (movieWatchlist.length === 0) {
        movieContainer.innerHTML = '<p class="no-results">No movies in your watchlist</p>';
    } else {
        movieContainer.innerHTML = movieWatchlist.map((item, index) => `
            <div class="watch-history-item" onclick="toggleDetails('movie', ${index})">
                <div class="watch-history-header">
                    <div class="watch-history-title">
                        <span class="type-badge movie">Movie</span>
                        <h3>${item.title}</h3>
                    </div>
                    <div class="watch-history-actions">
                        <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${item.id}, 'movie')">
                            <span class="trailer-icon">▶</span>
                            Watch Trailer
                        </button>
                    </div>
                </div>
                <div class="watch-history-details" id="movie-details-${index}" style="display: none;">
                    <div class="details-content">
                        <div class="details-grid">
                            <div class="poster-section">
                                ${item.poster_path ? 
                                    `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title} poster" class="poster-image">` :
                                    `<div class="no-poster">No Image Available</div>`
                                }
                            </div>
                            <div class="info-section">
                                <div class="info-header">
                                    <h2>${item.title}</h2>
                                    ${item.release_date ? `<p class="release-date">Released: ${new Date(item.release_date).toLocaleDateString()}</p>` : ''}
                                </div>
                                
                                <div class="ratings-section">
                                    ${item.vote_average ? `
                                        <div class="rating-item">
                                            <span class="rating-label">TMDB Rating:</span>
                                            <span class="rating-value">${item.vote_average.toFixed(1)}/10</span>
                                        </div>
                                    ` : ''}
                                </div>

                                ${item.overview ? `
                                    <div class="overview-section">
                                        <h3>Overview</h3>
                                        <p>${item.overview}</p>
                                    </div>
                                ` : ''}

                                ${item.genres ? `
                                    <div class="genres-section">
                                        <h3>Genres</h3>
                                        <div class="genre-tags">
                                            ${item.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="choice-btn" onclick="event.stopPropagation(); markAsWatched('movie', ${item.id})">Mark as Watched</button>
                            <button class="choice-btn" onclick="event.stopPropagation(); removeFromWatchlist('movie', ${item.id})">Remove from Watchlist</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Load shows
    const showWatchlist = JSON.parse(localStorage.getItem('showWatchlist')) || [];
    const showContainer = document.getElementById('showWatchlist');
    
    if (showWatchlist.length === 0) {
        showContainer.innerHTML = '<p class="no-results">No shows in your watchlist</p>';
    } else {
        showContainer.innerHTML = showWatchlist.map((item, index) => `
            <div class="watch-history-item" onclick="toggleDetails('show', ${index})">
                <div class="watch-history-header">
                    <div class="watch-history-title">
                        <span class="type-badge show">TV Show</span>
                        <h3>${item.name}</h3>
                    </div>
                    <div class="watch-history-actions">
                        <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${item.id}, 'show')">
                            <span class="trailer-icon">▶</span>
                            Watch Trailer
                        </button>
                    </div>
                </div>
                <div class="watch-history-details" id="show-details-${index}" style="display: none;">
                    <div class="details-content">
                        <div class="details-grid">
                            <div class="poster-section">
                                ${item.poster_path ? 
                                    `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.name} poster" class="poster-image">` :
                                    `<div class="no-poster">No Image Available</div>`
                                }
                            </div>
                            <div class="info-section">
                                <div class="info-header">
                                    <h2>${item.name}</h2>
                                    ${item.first_air_date ? `<p class="release-date">First Aired: ${new Date(item.first_air_date).toLocaleDateString()}</p>` : ''}
                                </div>
                                
                                <div class="ratings-section">
                                    ${item.vote_average ? `
                                        <div class="rating-item">
                                            <span class="rating-label">TMDB Rating:</span>
                                            <span class="rating-value">${item.vote_average.toFixed(1)}/10</span>
                                        </div>
                                    ` : ''}
                                </div>

                                ${item.overview ? `
                                    <div class="overview-section">
                                        <h3>Overview</h3>
                                        <p>${item.overview}</p>
                                    </div>
                                ` : ''}

                                ${item.genres ? `
                                    <div class="genres-section">
                                        <h3>Genres</h3>
                                        <div class="genre-tags">
                                            ${item.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="choice-btn" onclick="event.stopPropagation(); markAsWatched('show', ${item.id})">Mark as Watched</button>
                            <button class="choice-btn" onclick="event.stopPropagation(); removeFromWatchlist('show', ${item.id})">Remove from Watchlist</button>
                        </div>
            </div>
        </div>
        </div>
        `).join('');
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