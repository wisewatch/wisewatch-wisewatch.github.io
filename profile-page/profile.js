// Profile management
const USER_ID = 'user1'; // In a real app, this would come from authentication
let userProfile = null;

// Load user profile when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    setupAvatarUpload();
});

function loadUserProfile() {
    try {
        const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
        if (savedProfile) {
            userProfile = JSON.parse(savedProfile);
            
            // Load username and email
            if (userProfile.username) {
                document.getElementById('username').value = userProfile.username;
            }
            if (userProfile.email) {
                document.getElementById('email').value = userProfile.email;
            }
            
            // Load profile image
            if (userProfile.profileImage) {
                document.getElementById('profileImage').src = userProfile.profileImage;
            }

            // Load favorite genres
            if (userProfile.favoriteGenres) {
                const genreButtons = document.querySelectorAll('.genre-btn');
            genreButtons.forEach(button => {
                    if (userProfile.favoriteGenres.includes(button.textContent)) {
                    button.classList.add('selected');
                }
            });
            }
        } else {
            userProfile = {
                favoriteGenres: [],
                watchHistory: []
            };
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile. Please try again later.');
    }
}

function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    avatarInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('profileImage').src = e.target.result;
                if (!userProfile) {
                    userProfile = {};
                }
                userProfile.profileImage = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

function toggleGenre(button) {
    button.classList.toggle('selected');
}

function saveProfile() {
    try {
        if (!userProfile) {
            userProfile = {};
        }
        
        // Save username and email
        userProfile.username = document.getElementById('username').value;
        userProfile.email = document.getElementById('email').value;
        
        // Save favorite genres
        userProfile.favoriteGenres = Array.from(document.querySelectorAll('.genre-btn.selected'))
            .map(button => button.textContent);

        // Save to localStorage
        localStorage.setItem(`userProfile_${USER_ID}`, JSON.stringify(userProfile));
        
        alert('Profile saved successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
    }
}

function displayWatchHistory() {
    const watchHistoryDiv = document.getElementById('watchHistory');
    watchHistoryDiv.innerHTML = '';

    if (!userProfile.watchHistory || userProfile.watchHistory.length === 0) {
        watchHistoryDiv.innerHTML = '<p>No watch history yet.</p>';
        return;
    }

    userProfile.watchHistory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'result-item';
        itemElement.innerHTML = `
            <div class="movie-content">
                <h3>${item.title}</h3>
                <p>Type: ${item.type === 'tv' ? 'TV Show' : 'Movie'}</p>
                <p>Watched on: ${new Date(item.watchedDate).toLocaleDateString()}</p>
                <p>Rating: ${(item.rating / 2).toFixed(1)}/5</p>
                <button onclick="removeFromWatchHistory(${index})" class="delete-btn">Remove from History</button>
            </div>
            ${item.poster_path ? `<img src="https://image.tmdb.org/t/p/w200${item.poster_path}" alt="${item.title} poster">` : ''}
        `;
        watchHistoryDiv.appendChild(itemElement);
    });
}

function removeFromWatchHistory(index) {
    if (confirm('Are you sure you want to remove this from your watch history?')) {
        userProfile.watchHistory.splice(index, 1);
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        displayWatchHistory();
    }
}

// Function to add a movie to watch history (called from movie-finder.js)
function addToWatchHistory(movie) {
    if (!userProfile.watchHistory) {
        userProfile.watchHistory = [];
    }

    // Check if movie already exists in history
    const existingIndex = userProfile.watchHistory.findIndex(m => m.id === movie.id);
    if (existingIndex !== -1) {
        // Update existing entry
        userProfile.watchHistory[existingIndex].watchedDate = new Date().toISOString();
    } else {
        // Add new entry
        userProfile.watchHistory.unshift({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            rating: movie.vote_average,
            watchedDate: new Date().toISOString()
        });
    }

    // Keep only last 20 movies
    if (userProfile.watchHistory.length > 20) {
        userProfile.watchHistory = userProfile.watchHistory.slice(0, 20);
    }

    // Save updated profile
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
}

// --- Rate Movies Feature ---
const rateMoviesList = [
  { id: 1, title: 'Inception', poster: 'https://image.tmdb.org/t/p/w300//qmDpIHrmpJINaRKAfWQfftjCdyi.jpg' },
  { id: 2, title: 'The Matrix', poster: 'https://image.tmdb.org/t/p/w300//f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg' },
  { id: 3, title: 'Interstellar', poster: 'https://image.tmdb.org/t/p/w300//gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { id: 4, title: 'The Dark Knight', poster: 'https://image.tmdb.org/t/p/w300//qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { id: 5, title: 'Pulp Fiction', poster: 'https://image.tmdb.org/t/p/w300//d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' }
];
let currentRateIndex = 0;
let movieRatings = {};

function openRateMoviesModal() {
  // Load previous ratings if any
  const saved = localStorage.getItem('movieRatings_user1');
  movieRatings = saved ? JSON.parse(saved) : {};
  currentRateIndex = 0;
  showRateMovie();
  const modal = new bootstrap.Modal(document.getElementById('rateMoviesModal'));
  modal.show();
}

function showRateMovie() {
  const body = document.getElementById('rateMoviesBody');
  if (currentRateIndex >= rateMoviesList.length) {
    body.innerHTML = '<div class="text-center">All done! Thank you for rating.</div>';
    localStorage.setItem('movieRatings_user1', JSON.stringify(movieRatings));
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

function rateMovie(rating) {
  const movie = rateMoviesList[currentRateIndex];
  movieRatings[movie.id] = rating;
  currentRateIndex++;
  showRateMovie();
}

function eraseAllMovieRatings() {
  if (confirm('Are you sure you want to erase all your movie ratings? This cannot be undone.')) {
    localStorage.removeItem('movieRatings_user1');
    alert('All movie ratings have been erased.');
  }
}