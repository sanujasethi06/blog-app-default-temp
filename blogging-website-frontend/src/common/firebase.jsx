// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {GoogleAuthProvider, signInWithPopup} from 'firebase/auth';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDWt_2YhmtZz_9fSDUQo0hhvgmU5LMLaik",
  authDomain: "react-blog-project-mern.firebaseapp.com",
  projectId: "react-blog-project-mern",
  storageBucket: "react-blog-project-mern.appspot.com",
  messagingSenderId: "815736785990",
  appId: "1:815736785990:web:7a08ccbfd44e512bbcce47",
  measurementId: "G-4TCB3GERC3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

//Google Authentication

const provider = new GoogleAuthProvider();
const auth = getAuth();
export const authWithGoogle =async()=>{
    let user = null;
    await signInWithPopup(auth,provider)
    .then((result)=>{
        user= result.user
    })
    .catch((err)=>{
        console.log(err)
    })
    return user;
}

