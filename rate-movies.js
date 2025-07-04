// --- Rate Movies Feature ---
const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const USER_ID = 'user1';
let rateMoviesList = [];
let currentRateIndex = 0;
let movieRatings = {};
let ratedMovieIds = new Set();
let currentPage = 1;

// Load previous ratings if any
function loadRatedMovieIds() {
  const saved = localStorage.getItem('movieRatings_user1');
  movieRatings = saved ? JSON.parse(saved) : {};
  ratedMovieIds = new Set(Object.keys(movieRatings).map(id => parseInt(id)));
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getLikedAndInterestedMovieIds() {
  const ratings = JSON.parse(localStorage.getItem('movieRatings_user1') || '{}');
  return Object.entries(ratings)
    .filter(([_, v]) => v === 'liked' || v === 'interested')
    .map(([k, _]) => parseInt(k, 10));
}

async function fetchRecommendedMoviesBatch(batchSize = 5) {
  const likedIds = getLikedAndInterestedMovieIds();
  let recs = [];
  let seen = new Set([...ratedMovieIds]);
  // Fetch recommendations for each liked/interested movie
  for (const id of likedIds) {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${id}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    for (const rec of (data.results || [])) {
      if (!seen.has(rec.id)) {
        recs.push({
          id: rec.id,
          title: rec.title,
          poster: rec.poster_path ? `https://image.tmdb.org/t/p/w300/${rec.poster_path}` : '',
        });
        seen.add(rec.id);
      }
    }
    if (recs.length >= batchSize) break;
  }
  // Shuffle and limit
  shuffleArray(recs);
  return recs.slice(0, batchSize);
}

async function fetchMovies() {
  // If user has liked/interested movies, fetch recommendations
  const likedIds = getLikedAndInterestedMovieIds();
  let batch = [];
  if (likedIds.length > 0) {
    batch = await fetchRecommendedMoviesBatch(5);
  }
  // If not enough, fill with random popular movies
  if (batch.length < 5) {
    let movies = [];
    let tries = 0;
    let randomPage = Math.floor(Math.random() * 500) + 1;
    while (movies.length < 5 && tries < 10) {
      const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${randomPage}`);
      const data = await response.json();
      const newMovies = data.results.filter(m => !ratedMovieIds.has(m.id) && !batch.some(b => b.id === m.id));
      movies = movies.concat(newMovies);
      randomPage = Math.floor(Math.random() * 500) + 1;
      tries++;
    }
    shuffleArray(movies);
    batch = batch.concat(movies.slice(0, 5 - batch.length).map(m => ({
      id: m.id,
      title: m.title,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w300/${m.poster_path}` : '',
    })));
  }
  // Final shuffle for variety
  shuffleArray(batch);
  return batch;
}

document.addEventListener('DOMContentLoaded', async () => {
  loadRatedMovieIds();
  await startRatingBatch();
});

async function startRatingBatch() {
  rateMoviesList = await fetchMovies();
  currentRateIndex = 0;
  showRateMovie();
}

function showRateMovie() {
  const body = document.getElementById('rateMoviesBody');
  if (rateMoviesList.length === 0) {
    body.innerHTML = '<div class="text-center">No more movies to rate! <button class="btn btn-primary mt-2" onclick="startRatingBatch()">Try Again</button></div>';
    return;
  }
  if (currentRateIndex >= rateMoviesList.length) {
    localStorage.setItem('movieRatings_user1', JSON.stringify(movieRatings));
    body.innerHTML = '<div class="text-center">All done for this batch! <button class="btn btn-primary mt-2" onclick="startRatingBatch()">Rate More Movies</button></div>';
    return;
  }
  const movie = rateMoviesList[currentRateIndex];
  body.innerHTML = `
    <div class="text-center">
      <img src="${movie.poster}" alt="${movie.title}" class="img-fluid mb-2" style="max-height:220px;">
      <h5>${movie.title}</h5>
      <div class="mb-2">Have you seen this movie?</div>
      <div class="d-flex justify-content-center flex-wrap mb-2">
        <button class="btn btn-success m-1" onclick="rateMovie('liked')">Liked it</button>
        <button class="btn btn-warning m-1" onclick="rateMovie('meh')">Meh</button>
        <button class="btn btn-danger m-1" onclick="rateMovie('disliked')">Didn't like it</button>
        <button class="btn btn-secondary m-1" onclick="rateMovie('skip')">Skip</button>
      </div>
      <div class="mb-2">Haven't seen it?</div>
      <div class="d-flex justify-content-center flex-wrap">
        <button class="btn btn-info m-1" onclick="rateMovie('interested')">Interested</button>
        <button class="btn btn-outline-secondary m-1" onclick="rateMovie('not_interested')">Not interested</button>
      </div>
    </div>
  `;
}

window.rateMovie = function(rating) {
  const movie = rateMoviesList[currentRateIndex];
  movieRatings[movie.id] = rating;
  ratedMovieIds.add(movie.id);
  currentRateIndex++;
  showRateMovie();
}

window.startRatingBatch = startRatingBatch;

window.switchRateTab = function(tab) {
  document.getElementById('rateTitle').textContent = tab === 'movies' ? 'Rate Movies' : 'Rate Shows';
  document.getElementById('rateMoviesBody').style.display = tab === 'movies' ? '' : 'none';
  document.getElementById('rateShowsBody').style.display = tab === 'shows' ? '' : 'none';
  if (tab === 'movies') {
    setWelcomeMovieBatch();
  } else {
    setWelcomeShowBatch();
  }
};

// --- Shows Rating Logic ---
const SHOW_TMDB_API_KEY = TMDB_API_KEY;
const SHOW_TMDB_BASE_URL = TMDB_BASE_URL;
let rateShowsList = [];
let currentShowRateIndex = 0;
let showRatings = {};
let ratedShowIds = new Set();

function loadRatedShowIds() {
  const saved = localStorage.getItem('showRatings_user1');
  showRatings = saved ? JSON.parse(saved) : {};
  ratedShowIds = new Set(Object.keys(showRatings).map(id => parseInt(id)));
}

function getLikedAndInterestedShowIds() {
  const ratings = JSON.parse(localStorage.getItem('showRatings_user1') || '{}');
  return Object.entries(ratings)
    .filter(([_, v]) => v === 'liked' || v === 'interested')
    .map(([k, _]) => parseInt(k, 10));
}

async function fetchRecommendedShowsBatch(batchSize = 5) {
  const likedIds = getLikedAndInterestedShowIds();
  let recs = [];
  let seen = new Set([...ratedShowIds]);
  for (const id of likedIds) {
    const res = await fetch(`${SHOW_TMDB_BASE_URL}/tv/${id}/recommendations?api_key=${SHOW_TMDB_API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    for (const rec of (data.results || [])) {
      if (!seen.has(rec.id)) {
        recs.push({
          id: rec.id,
          name: rec.name,
          poster: rec.poster_path ? `https://image.tmdb.org/t/p/w300/${rec.poster_path}` : '',
        });
        seen.add(rec.id);
      }
    }
    if (recs.length >= batchSize) break;
  }
  shuffleArray(recs);
  return recs.slice(0, batchSize);
}

async function fetchShows() {
  const likedIds = getLikedAndInterestedShowIds();
  let batch = [];
  if (likedIds.length > 0) {
    batch = await fetchRecommendedShowsBatch(5);
  }
  if (batch.length < 5) {
    let shows = [];
    let tries = 0;
    let randomPage = Math.floor(Math.random() * 500) + 1;
    while (shows.length < 5 && tries < 10) {
      const response = await fetch(`${SHOW_TMDB_BASE_URL}/tv/popular?api_key=${SHOW_TMDB_API_KEY}&language=en-US&page=${randomPage}`);
      const data = await response.json();
      const newShows = data.results.filter(s => !ratedShowIds.has(s.id) && !batch.some(b => b.id === s.id));
      shows = shows.concat(newShows);
      randomPage = Math.floor(Math.random() * 500) + 1;
      tries++;
    }
    shuffleArray(shows);
    batch = batch.concat(shows.slice(0, 5 - batch.length).map(s => ({
      id: s.id,
      name: s.name,
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w300/${s.poster_path}` : '',
    })));
  }
  shuffleArray(batch);
  return batch;
}

async function setWelcomeShowBatch() {
  loadRatedShowIds();
  rateShowsList = await fetchShows();
  currentShowRateIndex = 0;
  showRateShow();
}

function showRateShow() {
  const body = document.getElementById('rateShowsBody');
  if (rateShowsList.length === 0) {
    body.innerHTML = '<div class="text-center">No more shows to rate! <button class="btn btn-primary mt-2" onclick="setWelcomeShowBatch()">Try Again</button></div>';
    return;
  }
  if (currentShowRateIndex >= rateShowsList.length) {
    localStorage.setItem('showRatings_user1', JSON.stringify(showRatings));
    body.innerHTML = '<div class="text-center">All done for this batch! <button class="btn btn-primary mt-2" onclick="setWelcomeShowBatch()">Rate More Shows</button></div>';
    return;
  }
  const show = rateShowsList[currentShowRateIndex];
  body.innerHTML = `
    <div class="text-center">
      <img src="${show.poster}" alt="${show.name}" class="img-fluid mb-2" style="max-height:220px;">
      <h5>${show.name}</h5>
      <div class="mb-2">Have you seen this show?</div>
      <div class="d-flex justify-content-center flex-wrap mb-2">
        <button class="btn btn-success m-1" onclick="rateShow('liked')">Liked it</button>
        <button class="btn btn-warning m-1" onclick="rateShow('meh')">Meh</button>
        <button class="btn btn-danger m-1" onclick="rateShow('disliked')">Didn't like it</button>
        <button class="btn btn-secondary m-1" onclick="rateShow('skip')">Skip</button>
      </div>
      <div class="mb-2">Haven't seen it?</div>
      <div class="d-flex justify-content-center flex-wrap">
        <button class="btn btn-info m-1" onclick="rateShow('interested')">Interested</button>
        <button class="btn btn-outline-secondary m-1" onclick="rateShow('not_interested')">Not interested</button>
      </div>
    </div>
  `;
}

window.rateShow = function(rating) {
  const show = rateShowsList[currentShowRateIndex];
  showRatings[show.id] = rating;
  ratedShowIds.add(show.id);
  currentShowRateIndex++;
  showRateShow();
}

// --- Movies: ensure correct batch loads on tab switch ---
async function setWelcomeMovieBatch() {
  loadRatedMovieIds();
  rateMoviesList = await fetchMovies();
  currentRateIndex = 0;
  showRateMovie();
}

// --- On load, default to movies tab ---
document.addEventListener('DOMContentLoaded', async () => {
  setWelcomeMovieBatch();
}); 