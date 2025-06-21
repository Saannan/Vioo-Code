import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    get, 
    set, 
    child, 
    update, 
    query, 
    orderByChild, 
    equalTo, 
    push, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQXA1Yf9CXa5lizXBq7tcABfrSaroIuLo",
    authDomain: "vcodesz.firebaseapp.com",
    databaseURL: "https://vcodesz-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vcodesz",
    storageBucket: "vcodesz.firebasestorage.app",
    messagingSenderId: "712929640679",
    appId: "1:712929640679:web:21a1b24911a10fb1872242"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db);

export { 
    db, 
    dbRef,
    ref, 
    get, 
    set, 
    child, 
    update, 
    query, 
    orderByChild, 
    equalTo,
    push,
    serverTimestamp
};