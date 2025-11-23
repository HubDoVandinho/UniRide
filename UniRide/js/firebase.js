// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
// REMOVIDO: import { getStorage } ...

const firebaseConfig = {
    apiKey: "AIzaSyBUO_ymNGqxpVKQICOAYtaW-VOkTnPo7eU",
    authDomain: "uniride666.firebaseapp.com",
    projectId: "uniride666",
    // storageBucket: REMOVIDO OU IGNORADO
    messagingSenderId: "1022762076576",
    appId: "1:1022762076576:web:be29ce792fdfafb8a9fcc5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar módulos
export const db = getFirestore(app);
export const auth = getAuth(app);
// export const storage = getStorage(app); // REMOVIDO