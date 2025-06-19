import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const firebaseConfig = {
    apiKey: "AIzaSyDQXA1Yf9CXa5lizXBq7tcABfrSaroIuLo",
    authDomain: "vcodesz.firebaseapp.com",
    databaseURL: "https://vcodesz-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vcodesz",
    storageBucket: "vcodesz.appspot.com",
    messagingSenderId: "712929640679",
    appId: "1:712929640679:web:21a1b24911a10fb1872242"
};

const supabaseConfig = {
    url: 'https://fllyfxfiwajcmkqpvabz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsbHlmeGZpd2FqY21rcXB2YWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjA4NzMsImV4cCI6MjA2NTgzNjg3M30.fxav0iq1OX8iQ4IzD0pnGtOTb73E9yCf6-9v6d_Wb78',
    bucket: 'vioo-code' 
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);