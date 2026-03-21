import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

  const firebaseConfig = {
    apiKey: "AIzaSyBt4yerjmCakhje0csoqhtHv_swelUF2go",
    authDomain: "maiproto.firebaseapp.com",
    projectId: "maiproto",
    storageBucket: "maiproto.firebasestorage.app",
    messagingSenderId: "253858038734",
    appId: "1:253858038734:web:ba58b25be43e9ae317e19f",
    measurementId: "G-7BEKLGHCCS"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);