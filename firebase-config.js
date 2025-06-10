// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAevXI9JVIF_UvaJA2IgZ2Npz6dLEs2j6w",
    authDomain: "wisewatch-1b6af.firebaseapp.com",
    projectId: "wisewatch-1b6af",
    storageBucket: "wisewatch-1b6af.appspot.com",
    messagingSenderId: "246028407902",
    appId: "1:246028407902:web:d9d436fc7da0e85af950cf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 