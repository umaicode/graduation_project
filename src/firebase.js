import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAibem__FEMxzSlmy27UloAUQfjX3Z9jos",
    authDomain: "pra2-64ffa.firebaseapp.com",
    projectId: "pra2-64ffa",
    storageBucket: "pra2-64ffa.appspot.com",
    messagingSenderId: "937597118159",
    appId: "1:937597118159:web:da861406ac7315d0b5f9ba",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
