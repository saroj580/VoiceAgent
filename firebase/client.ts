// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCL1LkB1vAcs2w5su7A6-iU0kPi45qGKu0",
  authDomain: "prepwise-2a975.firebaseapp.com",
  projectId: "prepwise-2a975",
  storageBucket: "prepwise-2a975.firebasestorage.app",
  messagingSenderId: "412441057073",
  appId: "1:412441057073:web:99628304701d93723fc210",
  measurementId: "G-MVQ50W6NEY"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);