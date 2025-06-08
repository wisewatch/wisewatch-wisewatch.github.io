const USER_ID = 'user1'; // In a real app, this would come from authentication
let userProfile = null;
let currentFilter = 'all';

// TMDB API configuration
const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Load user profile when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
});

function loadUserProfile() {
    try {
        const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
        if (savedProfile) {
            userProfile = JSON.parse(savedProfile);
            displayWatchHistory();
        } else {
            document.getElementById('watchHistoryList').innerHTML = '<p class="no-results">No watch history found.</p>';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('watchHistoryList').innerHTML = '<p class="error">Error loading watch history. Please try again later.</p>';
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

async function displayWatchHistory() {
    const watchHistoryList = document.getElementById('watchHistoryList');
    if (!userProfile || !userProfile.watchHistory || userProfile.watchHistory.length === 0) {
        watchHistoryList.innerHTML = '<p class="no-results">No watch history found.</p>';
        return;
    }

    // Filter watch history based on current filter
    const filteredHistory = userProfile.watchHistory.filter(item => {
        if (currentFilter === 'all') return true;
        return item.type === currentFilter;
    });

    if (filteredHistory.length === 0) {
        watchHistoryList.innerHTML = `<p class="no-results">No ${currentFilter === 'all' ? '' : currentFilter + ' '}items in watch history.</p>`;
        return;
    }

    // Create list items
    watchHistoryList.innerHTML = filteredHistory.map((item, index) => `
        <div class="watch-history-item" onclick="toggleDetails(${index})">
            <div class="watch-history-header">
                <div class="watch-history-title">
                    <span class="type-badge ${item.type}">${item.type === 'movie' ? 'Movie' : 'TV Show'}</span>
                    <h3>${item.title || item.name}</h3>
                </div>
                <div class="watch-history-actions">
                    <button class="trailer-btn" onclick="event.stopPropagation(); watchTrailer(${item.id}, '${item.type}')">
                        <span class="trailer-icon">▶</span>
                        Watch Trailer
                    </button>
                    <div class="watch-history-date">
                        Watched: ${new Date(item.watchedDate).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div class="watch-history-details" id="details-${index}" style="display: none;">
                <div class="details-content">
                    <div class="details-grid">
                        <div class="poster-section">
                            ${item.poster_path ? 
                                `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${item.title || item.name} poster" class="poster-image">` :
                                `<div class="no-poster">No Image Available</div>`
                            }
                        </div>
                        <div class="info-section">
                            <div class="info-header">
                                <h2>${item.title || item.name}</h2>
                                ${item.release_date ? `<p class="release-date">Released: ${new Date(item.release_date).toLocaleDateString()}</p>` : ''}
                            </div>
                            
                            <div class="ratings-section">
                                ${item.rating ? `
                                    <div class="rating-item">
                                        <span class="rating-label">Your Rating:</span>
                                        <span class="rating-value">${item.rating}/10</span>
                                    </div>
                                ` : ''}
                                ${item.vote_average ? `
                                    <div class="rating-item">
                                        <span class="rating-label">TMDB Rating:</span>
                                        <span class="rating-value">${item.vote_average.toFixed(1)}/10</span>
                                    </div>
                                ` : ''}
                                ${item.ageRating ? `
                                    <div class="rating-item">
                                        <span class="rating-label">Age Rating:</span>
                                        <span class="rating-value age-rating">${item.ageRating}</span>
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

                            ${item.streamingInfo ? `
                                <div class="streaming-section">
                                    <h3>Available On</h3>
                                    <div class="streaming-platforms">
                                        ${item.streamingInfo.stream && item.streamingInfo.stream.length > 0 ? `
                                            <div class="streaming-group">
                                                <h4>Streaming</h4>
                                                ${item.streamingInfo.stream.map(provider => `
                                                    <a href="https://www.justwatch.com/us/search?q=${encodeURIComponent(item.title || item.name)}" target="_blank" class="streaming-platform">
                                                        <span class="platform-name">${provider.name}</span>
                                                    </a>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                        ${item.streamingInfo.rent && item.streamingInfo.rent.length > 0 ? `
                                            <div class="streaming-group">
                                                <h4>Rent</h4>
                                                ${item.streamingInfo.rent.map(provider => `
                                                    <a href="https://www.justwatch.com/us/search?q=${encodeURIComponent(item.title || item.name)}" target="_blank" class="streaming-platform">
                                                        <span class="platform-name">${provider.name}</span>
                                                    </a>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                        ${item.streamingInfo.buy && item.streamingInfo.buy.length > 0 ? `
                                            <div class="streaming-group">
                                                <h4>Buy</h4>
                                                ${item.streamingInfo.buy.map(provider => `
                                                    <a href="https://www.justwatch.com/us/search?q=${encodeURIComponent(item.title || item.name)}" target="_blank" class="streaming-platform">
                                                        <span class="platform-name">${provider.name}</span>
                                                    </a>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                        ${(!item.streamingInfo.stream?.length && !item.streamingInfo.rent?.length && !item.streamingInfo.buy?.length) ? 
                                            '<p class="no-streaming">No streaming information available</p>' : ''}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <button class="remove-btn" onclick="event.stopPropagation(); removeFromWatchHistory(${index})">Remove from History</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleDetails(index) {
    const detailsElement = document.getElementById(`details-${index}`);
    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
    } else {
        detailsElement.style.display = 'none';
    }
}

function filterHistory(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(filter)) {
            btn.classList.add('active');
        }
    });
    
    displayWatchHistory();
}

function removeFromWatchHistory(index) {
    if (confirm('Are you sure you want to remove this item from your watch history?')) {
        try {
            userProfile.watchHistory.splice(index, 1);
            localStorage.setItem(`userProfile_${USER_ID}`, JSON.stringify(userProfile));
            displayWatchHistory();
        } catch (error) {
            console.error('Error removing from watch history:', error);
            alert('Error removing item from watch history. Please try again.');
        }
    }
}

async function watchTrailer(id, type) {
    try {
        const trailerUrl = await getTrailerUrl(id, type === 'movie' ? 'movie' : 'tv');
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