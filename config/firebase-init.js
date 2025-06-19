import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const firebaseConfig = {
    apiKey: "AIzaSyC9LImjPAa_kn028yEjVyyfHP_4Rb9y_CI",
    authDomain: "vioo-code.firebaseapp.com",
    databaseURL: "https://vioo-code-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vioo-code",
    storageBucket: "vioo-code.firebasestorage.app",
    messagingSenderId: "382046884335",
    appId: "1:382046884335:web:4b136306938bdefabc661a",
    measurementId: "G-JNYQCDV3CD"
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