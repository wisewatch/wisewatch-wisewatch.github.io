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

async function fetchMovies() {
  // Fetch popular movies from TMDB, skipping already rated ones
  let movies = [];
  let tries = 0;
  while (movies.length < 5 && tries < 10) {
    const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${currentPage}`);
    const data = await response.json();
    const newMovies = data.results.filter(m => !ratedMovieIds.has(m.id));
    movies = movies.concat(newMovies);
    currentPage++;
    tries++;
  }
  // Limit to 5 per batch
  return movies.slice(0, 5).map(m => ({
    id: m.id,
    title: m.title,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w300/${m.poster_path}` : '',
  }));
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