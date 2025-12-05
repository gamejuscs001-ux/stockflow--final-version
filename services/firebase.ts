import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD373pjJUom29hV4Jr-ZV0RyNmxgNyuVP4",
  authDomain: "stockflow-app-b4c2f.firebaseapp.com",
  projectId: "stockflow-app-b4c2f",
  storageBucket: "stockflow-app-b4c2f.firebasestorage.app",
  messagingSenderId: "2651548276",
  appId: "1:2651548276:web:f263ecddc08522f3f93f21"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);