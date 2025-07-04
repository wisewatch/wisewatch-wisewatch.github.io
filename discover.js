const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const USER_ID = 'user1';

function getRatedMovieIds() {
  const ratings = JSON.parse(localStorage.getItem('movieRatings_user1') || '{}');
  return Object.keys(ratings).map(id => parseInt(id, 10));
}

function getLikedAndInterestedMovieIds() {
  const ratings = JSON.parse(localStorage.getItem('movieRatings_user1') || '{}');
  return Object.entries(ratings)
    .filter(([_, v]) => v === 'liked' || v === 'interested')
    .map(([k, _]) => parseInt(k, 10));
}

async function fetchRecommendedMovies(movieId) {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  const data = await res.json();
  return data.results || [];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function renderMovies(movies) {
  const container = document.getElementById('discoverMovies');
  container.innerHTML = '';
  if (movies.length === 0) {
    container.innerHTML = '<div class="text-center">No recommendations yet. Rate some movies first!</div>';
    return;
  }
  movies.forEach(movie => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${movie.poster_path ? 'https://image.tmdb.org/t/p/w300/' + movie.poster_path : 'images/logo.png'}" class="card-img-top" alt="${movie.title}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${movie.title}</h5>
          <a href="https://www.themoviedb.org/movie/${movie.id}" target="_blank" class="btn btn-primary mt-auto">View on TMDB</a>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

async function discoverMovies() {
  const likedIds = getLikedAndInterestedMovieIds();
  const alreadyRated = new Set(getRatedMovieIds());
  if (likedIds.length === 0) {
    renderMovies([]);
    return;
  }
  // Get filter values
  const minYear = document.getElementById('minYear').value;
  const maxYear = document.getElementById('maxYear').value;
  const minRating = document.getElementById('ratingFilter').value;
  const ageRating = document.getElementById('ageRatingFilter').value;

  const recMap = new Map(); // movieId -> {movie, count}
  for (const id of likedIds) {
    const recs = await fetchRecommendedMovies(id);
    for (const rec of recs) {
      if (alreadyRated.has(rec.id)) continue; // skip already rated
      // Filter by year
      if (minYear && rec.release_date && rec.release_date < `${minYear}-01-01`) continue;
      if (maxYear && rec.release_date && rec.release_date > `${maxYear}-12-31`) continue;
      // Filter by rating
      if (minRating && rec.vote_average < parseFloat(minRating)) continue;
      // Filter by age rating (certification)
      if (ageRating && rec.adult !== undefined) {
        // Note: TMDB API doesn't always provide certification in recs, so this is a best effort
        // You may want to fetch details for each rec to get certification if needed
        // For now, skip this filter if not available
      }
      if (!recMap.has(rec.id)) {
        recMap.set(rec.id, { movie: rec, count: 1 });
      } else {
        recMap.get(rec.id).count++;
      }
    }
  }
  // Convert to array, sort by count desc, then shuffle within same-count groups
  let recArr = Array.from(recMap.values());
  recArr.sort((a, b) => b.count - a.count);
  // Shuffle within same-count groups for variety
  let grouped = [];
  let lastCount = null;
  let group = [];
  for (const item of recArr) {
    if (lastCount === null || item.count === lastCount) {
      group.push(item);
    } else {
      shuffleArray(group);
      grouped = grouped.concat(group);
      group = [item];
    }
    lastCount = item.count;
  }
  if (group.length) shuffleArray(grouped = grouped.concat(group));
  // Only show up to 24 recommendations for performance
  renderMovies(grouped.slice(0, 24).map(x => x.movie));
}

function getRatedShowIds() {
  const ratings = JSON.parse(localStorage.getItem('showRatings_user1') || '{}');
  return Object.keys(ratings).map(id => parseInt(id, 10));
}

function getLikedAndInterestedShowIds() {
  const ratings = JSON.parse(localStorage.getItem('showRatings_user1') || '{}');
  return Object.entries(ratings)
    .filter(([_, v]) => v === 'liked' || v === 'interested')
    .map(([k, _]) => parseInt(k, 10));
}

async function fetchRecommendedShows(showId) {
  const res = await fetch(`${TMDB_BASE_URL}/tv/${showId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  const data = await res.json();
  return data.results || [];
}

function renderShows(shows) {
  const container = document.getElementById('discoverShows');
  container.innerHTML = '';
  if (shows.length === 0) {
    container.innerHTML = '<div class="text-center">No show recommendations yet. Rate some shows first!</div>';
    return;
  }
  shows.forEach(show => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${show.poster_path ? 'https://image.tmdb.org/t/p/w300/' + show.poster_path : 'images/logo.png'}" class="card-img-top" alt="${show.name}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${show.name}</h5>
          <a href="https://www.themoviedb.org/tv/${show.id}" target="_blank" class="btn btn-primary mt-auto">View on TMDB</a>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

async function discoverShows() {
  const likedIds = getLikedAndInterestedShowIds();
  const alreadyRated = new Set(getRatedShowIds());
  if (likedIds.length === 0) {
    renderShows([]);
    return;
  }
  // Get filter values
  const minYear = document.getElementById('minYear').value;
  const maxYear = document.getElementById('maxYear').value;
  const minRating = document.getElementById('ratingFilter').value;
  const status = document.getElementById('statusFilter').value;

  const recMap = new Map(); // showId -> {show, count}
  for (const id of likedIds) {
    const recs = await fetchRecommendedShows(id);
    for (const rec of recs) {
      if (alreadyRated.has(rec.id)) continue; // skip already rated
      // Filter by year
      if (minYear && rec.first_air_date && rec.first_air_date < `${minYear}-01-01`) continue;
      if (maxYear && rec.first_air_date && rec.first_air_date > `${maxYear}-12-31`) continue;
      // Filter by rating
      if (minRating && rec.vote_average < parseFloat(minRating)) continue;
      // Filter by status (not available in recs, so skip for now)
      if (!recMap.has(rec.id)) {
        recMap.set(rec.id, { show: rec, count: 1 });
      } else {
        recMap.get(rec.id).count++;
      }
    }
  }
  // Convert to array, sort by count desc, then shuffle within same-count groups
  let recArr = Array.from(recMap.values());
  recArr.sort((a, b) => b.count - a.count);
  // Shuffle within same-count groups for variety
  let grouped = [];
  let lastCount = null;
  let group = [];
  for (const item of recArr) {
    if (lastCount === null || item.count === lastCount) {
      group.push(item);
    } else {
      shuffleArray(group);
      grouped = grouped.concat(group);
      group = [item];
    }
    lastCount = item.count;
  }
  if (group.length) shuffleArray(grouped = grouped.concat(group));
  // Only show up to 24 recommendations for performance
  renderShows(grouped.slice(0, 24).map(x => x.show));
}

// --- Call both discover functions on load ---
function refreshRecommendations() {
  if (document.getElementById('movies-tab').classList.contains('active')) {
    discoverMovies();
  } else {
    discoverShows();
  }
}

discoverMovies();
discoverShows(); 