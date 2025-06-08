const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }));
}

function readDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: [] };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing to database:', error);
        return false;
    }
}

function getUserProfile(userId) {
    const db = readDatabase();
    return db.users.find(user => user.id === userId) || null;
}

function saveUserProfile(userId, profile) {
    const db = readDatabase();
    const userIndex = db.users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
        // New user
        db.users.push({ id: userId, ...profile });
    } else {
        // Update existing user
        db.users[userIndex] = { ...db.users[userIndex], ...profile };
    }
    
    return writeDatabase(db);
}

function addToWatchHistory(userId, movie) {
    const db = readDatabase();
    const userIndex = db.users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
        return false;
    }
    
    const user = db.users[userIndex];
    if (!user.watchHistory) {
        user.watchHistory = [];
    }
    
    // Check if movie already exists in history
    const existingIndex = user.watchHistory.findIndex(m => m.id === movie.id);
    if (existingIndex !== -1) {
        // Update existing entry
        user.watchHistory[existingIndex].watchedDate = new Date().toISOString();
    } else {
        // Add new entry
        user.watchHistory.unshift({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            rating: movie.vote_average,
            watchedDate: new Date().toISOString()
        });
    }
    
    // Keep only last 20 movies
    if (user.watchHistory.length > 20) {
        user.watchHistory = user.watchHistory.slice(0, 20);
    }
    
    return writeDatabase(db);
}

module.exports = {
    getUserProfile,
    saveUserProfile,
    addToWatchHistory
}; 