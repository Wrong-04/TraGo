import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDA9q03yjIMaAzrgXP7ONQHqqY-A-SUW4w",
  authDomain: "bonus6firebase-c10d5.firebaseapp.com",
  projectId: "bonus6firebase-c10d5",
  storageBucket: "bonus6firebase-c10d5.firebasestorage.app",
  messagingSenderId: "526953099172",
  appId: "1:526953099172:web:da040d44ae0256502a5b31",
  measurementId: "G-XEEBDQSEY5"
};
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
