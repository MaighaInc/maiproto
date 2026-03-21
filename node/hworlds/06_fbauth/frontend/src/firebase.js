import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

  const firebaseConfig = {
    apiKey: import.meta.env.MAIFB_API_KEY,
    authDomain: import.meta.env.MAIFB_AUTH_DOMAIN,
    projectId: import.meta.env.MAIFB_PROJECT_ID,
    storageBucket: import.meta.env.MAIFB_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.MAIFB_MESSAGING_SENDER_ID,
    appId: import.meta.env.MAIFB_APP_ID,
    measurementId: import.meta.env.MAIFB_MEASUREMENT_ID
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);