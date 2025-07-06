const TMDB_API_KEY = '1e6c49b4cc57e66a33167920ed6ce4cb'; // Replace with your API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const USER_ID = 'user1'; // In a real app, this would come from authentication

// Cache for genre data
let genreCache = null;
let currentPage = 1;
let currentSearchType = null;
let currentSearchParams = null;

async function getGenres() {
    if (genreCache) return genreCache;
    
    try {
        const response = await fetch(`${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        genreCache = data.genres;
        return genreCache;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
}

async function searchSimilarShows() {
    const searchInput = document.getElementById('showSearch');
    const showTitle = searchInput.value.trim();
    
    if (!showTitle) {
        alert('Please enter a TV show title');
        return;
    }

    currentPage = 1;
    currentSearchType = 'similar';
    
    try {
        // First, search for the show to get its ID
        const searchResponse = await fetch(
            `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(showTitle)}&page=1`
        );
        const searchData = await searchResponse.json();
        
        if (searchData.results.length === 0) {
            document.getElementById('showResults').innerHTML = '<p>No TV shows found matching your search. Please try a different title.</p>';
            document.getElementById('searchedShowInfo').innerHTML = '';
            return;
        }

        // Get the first show's ID and overview
        const showId = searchData.results[0].id;
        const searchOverview = searchData.results[0].overview;
        currentSearchParams = { showId };

        // Fetch full details for the searched show
        const detailsResponse = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const showDetails = await detailsResponse.json();
        // Add genre_ids for display compatibility
        if (showDetails.genres) {
            showDetails.genre_ids = showDetails.genres.map(g => g.id);
        }
        await displaySearchedShowInfo(showDetails, searchOverview);

        // Get similar shows
        const similarResponse = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}/recommendations?api_key=${TMDB_API_KEY}&page=${currentPage}`
        );
        const similarData = await similarResponse.json();
        
        displayShows(similarData.results);
        updateLoadMoreButton(similarData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('showResults').innerHTML = `<p>Error: ${error.message}. Please try again later.</p>`;
        document.getElementById('searchedShowInfo').innerHTML = '';
    }
}

async function findShows() {
    const selectedGenres = Array.from(document.querySelectorAll('.genre-btn.selected'))
        .map(button => button.textContent);
    
    if (selectedGenres.length === 0) {
        document.getElementById('showResults').innerHTML = '<p>Please select at least one genre!</p>';
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
            document.getElementById('showResults').innerHTML = '<p>No matching genres found in the database. Please try different genres.</p>';
            return;
        }

        // Get filter values
        const minYear = document.getElementById('minYear').value;
        const maxYear = document.getElementById('maxYear').value;
        const minRating = document.getElementById('ratingFilter').value;
        const status = document.getElementById('statusFilter').value;

        // Build the API URL with filters
        let apiUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${selectedGenreIds.join(',')}&sort_by=vote_average.desc&vote_count.gte=1000&language=en-US&page=${currentPage}`;

        // Add year range if specified
        if (minYear) {
            apiUrl += `&first_air_date.gte=${minYear}-01-01`;
        }
        if (maxYear) {
            apiUrl += `&first_air_date.lte=${maxYear}-12-31`;
        }

        // Add rating filter if specified
        if (minRating) {
            apiUrl += `&vote_average.gte=${minRating}`;
        }

        // Add status filter if specified
        if (status !== '') {
            apiUrl += `&with_status=${status}`;
        }

        currentSearchParams = { 
            genreIds: selectedGenreIds,
            minYear,
            maxYear,
            minRating,
            status
        };
        
        const showsResponse = await fetch(apiUrl);
        
        if (!showsResponse.ok) {
            throw new Error(`HTTP error! status: ${showsResponse.status}`);
        }
        
        const showsData = await showsResponse.json();
        displayShows(showsData.results);
        updateLoadMoreButton(showsData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('showResults').innerHTML = `<p>Error: ${error.message}. Please try again later.</p>`;
    }
}

async function loadMoreShows() {
    if (!currentSearchType || !currentSearchParams) return;
    
    currentPage++;
    const resultsDiv = document.getElementById('showResults');
    
    try {
        let response;
        if (currentSearchType === 'similar') {
            response = await fetch(
                `${TMDB_BASE_URL}/tv/${currentSearchParams.showId}/similar?api_key=${TMDB_API_KEY}&page=${currentPage}`
            );
        } else {
            // Build the API URL with filters
            let apiUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${currentSearchParams.genreIds.join(',')}&sort_by=vote_average.desc&vote_count.gte=1000&language=en-US&page=${currentPage}`;

            // Add year range if specified
            if (currentSearchParams.minYear) {
                apiUrl += `&first_air_date.gte=${currentSearchParams.minYear}-01-01`;
        }
            if (currentSearchParams.maxYear) {
                apiUrl += `&first_air_date.lte=${currentSearchParams.maxYear}-12-31`;
            }

            // Add rating filter if specified
            if (currentSearchParams.minRating) {
                apiUrl += `&vote_average.gte=${currentSearchParams.minRating}`;
            }

            // Add status filter if specified
            if (currentSearchParams.status !== '') {
                apiUrl += `&with_status=${currentSearchParams.status}`;
            }

            response = await fetch(apiUrl);
        }
        
        const data = await response.json();
        displayShows(data.results, true);
        updateLoadMoreButton(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading more shows. Please try again.');
    }
}

async function getStreamingInfo(showId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}/watch/providers?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        
        // Get US streaming providers
        const usProviders = data.results?.US || {};
        const flatrate = usProviders.flatrate || [];
        const rent = usProviders.rent || [];
        const buy = usProviders.buy || [];
        
        return {
            stream: flatrate.map(p => ({
                name: p.provider_name,
                logo: p.logo_path,
                type: 'stream'
            })),
            rent: rent.map(p => ({
                name: p.provider_name,
                logo: p.logo_path,
                type: 'rent'
            })),
            buy: buy.map(p => ({
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

async function getShowContentRating(showId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}/content_ratings?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        const usRating = data.results.find(rating => rating.iso_3166_1 === 'US');
        if (usRating && usRating.rating) {
            return usRating.rating;
        }
        return 'Not Rated';
    } catch (error) {
        console.error('Error fetching content rating:', error);
        return 'Not Rated';
    }
}

async function getTrailerUrl(showId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${showId}/videos?api_key=${TMDB_API_KEY}`
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

async function displayShows(shows, append = false) {
    const resultsDiv = document.getElementById('showResults');
    if (!append) {
        resultsDiv.innerHTML = '';
    }

    if (shows.length === 0) {
        if (!append) {
            resultsDiv.innerHTML = '<p>No TV shows found. Try different criteria!</p>';
        }
        return;
    }

    // Get watch history
    const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
    const userProfile = savedProfile ? JSON.parse(savedProfile) : { watchHistory: [] };
    const watchHistoryIds = userProfile.watchHistory.map(item => item.id);

    // Filter out shows that are in watch history
    let filteredShows = shows.filter(show => !watchHistoryIds.includes(show.id));

    // Apply services filter if enabled
    const servicesFilter = document.getElementById('servicesFilter')?.value === 'true';
    if (servicesFilter) {
        const userServices = JSON.parse(localStorage.getItem('userServices_user1') || '[]');
        if (userServices.length > 0) {
            // Filter shows to only show those available on user's services
            // This is a simplified filter - in a real app you'd check actual availability
            // For now, we'll show all shows but add a note about the filter
            console.log('Services filter enabled, user services:', userServices);
        }
    }

    if (filteredShows.length === 0) {
        if (!append) {
            resultsDiv.innerHTML = '<p>No new shows found matching your criteria. Try different filters or check your watch history!</p>';
            }
        return;
    }

    for (const show of filteredShows) {
        const streamingInfo = await getStreamingInfo(show.id);
        const trailerUrl = await getTrailerUrl(show.id);
        
        const showElement = document.createElement('div');
        showElement.className = 'result-item';
        showElement.innerHTML = `
            <div class="show-content">
                <div class="show-header">
                <h3>${show.name}</h3>
                    ${trailerUrl ? `
                        <button class="trailer-btn" onclick="window.open('${trailerUrl}', '_blank')">
                            <span class="trailer-icon">▶</span>
                            Watch Trailer
                        </button>
                    ` : ''}
                </div>
                <p>First Air Date: ${show.first_air_date || 'Unknown'}</p>
                <p>Rating: ${(show.vote_average / 2).toFixed(1)}/5</p>
                
                <div class="dropdown-section">
                    <button class="dropdown-btn" onclick="toggleDropdown(this)">
                        Overview <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="dropdown-content">
                        <p>${show.overview || 'No overview available.'}</p>
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

                <button onclick="addToWatchHistory(${JSON.stringify(show).replace(/"/g, '&quot;')})" class="choice-btn">Add to Watch History</button>
            </div>
            ${show.poster_path ? `<img src="https://image.tmdb.org/t/p/w200${show.poster_path}" alt="${show.name} poster">` : ''}
        `;
        resultsDiv.appendChild(showElement);
    }
}

function updateLoadMoreButton(data) {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    loadMoreBtn.style.display = data.page < data.total_pages ? 'block' : 'none';
}

function toggleGenre(button) {
    button.classList.toggle('selected');
}

// Load favorite genres when page loads
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
window.addToWatchHistory = async function(show) {
    try {
        // Get current profile from localStorage
        const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
        let userProfile = savedProfile ? JSON.parse(savedProfile) : { watchHistory: [] };
        
        if (!userProfile.watchHistory) {
            userProfile.watchHistory = [];
        }
        
        // Get additional show information
        const streamingInfo = await getStreamingInfo(show.id);
        const contentRating = await getShowContentRating(show.id);
        
        // Check if show already exists in history
        const existingIndex = userProfile.watchHistory.findIndex(s => s.id === show.id);
        if (existingIndex !== -1) {
            // Update existing entry
            userProfile.watchHistory[existingIndex] = {
                ...userProfile.watchHistory[existingIndex],
                watchedDate: new Date().toISOString(),
                vote_average: show.vote_average,
                streamingInfo: streamingInfo,
                ageRating: contentRating
            };
        } else {
            // Add new entry with all information
            userProfile.watchHistory.unshift({
                id: show.id,
                name: show.name,
                title: show.name, // For compatibility with movie display
                poster_path: show.poster_path,
                overview: show.overview,
                first_air_date: show.first_air_date,
                release_date: show.first_air_date, // For compatibility with movie display
                vote_average: show.vote_average,
                genres: show.genre_ids ? show.genre_ids.map(id => {
                    const genre = genreCache.find(g => g.id === id);
                    return genre ? genre.name : null;
                }).filter(Boolean) : [],
                watchedDate: new Date().toISOString(),
                type: 'tv',
                streamingInfo: streamingInfo,
                ageRating: contentRating
            });
        }
        
        // Keep only last 20 shows
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

function createShowElement(show) {
    const element = document.createElement('div');
    element.className = 'media-item';
    
    const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';
    
    element.innerHTML = `
        <div class="media-info">
            <h3>${show.name} ${year ? `(${year})` : ''}</h3>
            <p>${show.overview || 'No description available'}</p>
            <div class="media-details">
                <span class="rating">⭐ ${show.vote_average?.toFixed(1) || 'N/A'}</span>
                <span class="genres">${show.genres?.join(', ') || 'No genres'}</span>
            </div>
        </div>
        <div class="media-actions">
            <button onclick="addToWatchlist('show', ${JSON.stringify(show).replace(/"/g, '&quot;')})" class="watchlist-btn">Add to Watchlist</button>
        </div>
    `;
    
    return element;
}

window.addToWatchlist = function(type, item) {
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
};

// Helper to display the searched show info
async function displaySearchedShowInfo(show, fallbackOverview) {
    const container = document.getElementById('searchedShowInfo');
    container.innerHTML = '';
    // Fetch extra info
    const contentRating = await getShowContentRating(show.id);
    const streamingInfo = await getStreamingInfo(show.id);
    const trailerUrl = await getTrailerUrl(show.id);
    // Build element
    const element = document.createElement('div');
    element.className = 'searched-movie'; // reuse style
    const overview = show.overview && show.overview.trim() ? show.overview : (fallbackOverview || 'No overview available.');
    element.innerHTML = `
        <div class="movie-content">
            <div class="movie-header">
                <h3>${show.name}</h3>
                ${trailerUrl ? `
                    <button class="trailer-btn" onclick="window.open('${trailerUrl}', '_blank')">
                        <span class="trailer-icon">▶</span>
                        Watch Trailer
                    </button>
                ` : ''}
            </div>
            <p>First Air Date: ${show.first_air_date || 'Unknown'}</p>
            <p>Rating: ${(show.vote_average / 2).toFixed(1)}/5</p>
            <p>Age Rating: ${contentRating}</p>
            <div class="dropdown-section">
                <button class="dropdown-btn" onclick="toggleDropdown(this)">
                    Overview <span class="dropdown-arrow">▼</span>
                </button>
                <div class="dropdown-content">
                    <p>${overview}</p>
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
                <button class="choice-btn add-history-btn">Add to Watch History</button>
                <button class="watchlist-btn">Add to Watchlist</button>
            </div>
        </div>
        ${show.poster_path ? `<img src=\"https://image.tmdb.org/t/p/w200${show.poster_path}\" alt=\"${show.name} poster\">` : ''}
    `;
    // Add a label
    const label = document.createElement('div');
    label.className = 'searched-movie-label';
    label.innerHTML = '<h2>Searched Show</h2>';
    container.appendChild(label);
    container.appendChild(element);
    // Attach event listeners
    element.querySelector('.add-history-btn').onclick = () => window.addToWatchHistory(show);
    element.querySelector('.watchlist-btn').onclick = () => window.addToWatchlist('show', show);
} 