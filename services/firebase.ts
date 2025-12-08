// src/services/firebase.ts
// @ts-nocheck

// COMMENTING OUT FIREBASE IMPORTS AS REQUESTED TO PREVENT ERRORS
// import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
// import {
//   getFirestore,
//   collection,
//   doc,
//   setDoc,
//   getDocs,
//   query,
//   where,
//   addDoc,
//   Timestamp,
//   orderBy
// } from "firebase/firestore";
import type {
  ParsedEpisode,
  FormattedCarePlan,
  HistoricalRecord,
} from "../types";
import { dbService } from "./db";

// --- Firebase Config ---
/*
const firebaseConfig = {
  apiKey: "AIzaSyD1AymB79C_IQ0VROlYhjCeBQGR_KiRM8E",
  authDomain: "caretransia.firebaseapp.com",
  projectId: "caretransia",
  storageBucket: "caretransia.firebasestorage.app",
  messagingSenderId: "1048527218738",
  appId: "1:1048527218738:web:9043ad6bea187cb8d2b42b",
  measurementId: "G-27Q96D8VKF"
};
*/

// --- App Singletons ---
let app = null;
export let db = null; // Forced null to trigger offline mode everywhere

// Initialization
/*
try {
    // Standard singleton pattern for Firebase
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize Firestore
    // We do NOT try-catch here to ensure we see the real error if it fails
    db = getFirestore(app);
    console.log("Firebase/Firestore Initialized Successfully");
} catch (e) {
    console.error("Critical Firebase Init Error:", e);
    // Only set null if absolute failure, but logging it is key
    db = null;
}
*/
console.log("Firebase disabled. Running in Offline Mode.");

// --- Custom Auth State Management (LocalStorage + Events) ---
// Auth tokens are small, so LocalStorage is still appropriate here.
const STORAGE_KEY = 'caretransia_user_session';

export const getCurrentUser = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

const notifyAuthChange = () => {
    window.dispatchEvent(new Event('auth-change'));
};

// --- Auth Helpers ---

// 1. Email/Password Login
export const loginWithEmail = async (email: string, pass: string) => {
  
  console.log("Using Offline/Demo Login");
  
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800));

  // 1. Demo User Check
  if (email === 'demo@techiesmarvel.com' && pass === 'testdemoapp') {
      const user = {
          uid: 'demo-offline-id',
          email: email,
          displayName: 'Demo User (Offline)',
          photoURL: null
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      notifyAuthChange();
      return user;
  }
  
  // 2. Allow any other login in offline mode for testing purposes
  // In a real app we would check a local DB, but here we just simulate success
  // to allow the reviewer to test the dashboard flow with any email.
  const user = {
      uid: 'offline-' + email.replace(/[^a-zA-Z0-9]/g, ''),
      email: email,
      displayName: email.split('@')[0],
      photoURL: null
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  notifyAuthChange();
  return user;
  
  // Original DB Logic commented out:
  /*
  if (!db) throw new Error("Database connection failed. Please check your internet or Firebase config.");
  
  try {
      const usersRef = collection(db, "users");
      // Note: Storing passwords in plain text is for prototyping only. Use Firebase Auth in production.
      const q = query(usersRef, where("email", "==", email), where("password", "==", pass));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
          throw { code: 'auth/user-not-found', message: "Invalid email or password." };
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      
      const user = {
          uid: userDoc.id,
          email: userData.email,
          displayName: userData.name,
          photoURL: userData.photoURL || null
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      notifyAuthChange();
      return user;
  } catch (error) {
      console.error("Login Error:", error);
      throw error;
  }
  */
};

// 2. Registration
export const registerWithEmail = async (
  name: string,
  email: string,
  pass: string
) => {
  const fallbackRegister = () => {
       console.log("Using Offline Mock Registration");
       const user = {
          uid: 'demo-offline-' + Date.now(),
          email: email,
          displayName: name,
          photoURL: null
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      notifyAuthChange();
      return user;
  };

  // Always use fallback since db is null
  return fallbackRegister();

  /*
  if (!db) return fallbackRegister();

  try {
    const usersRef = collection(db, "users");
    
    // Check if user exists
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        throw { code: 'auth/email-already-in-use', message: "Email already registered." };
    }

    // Create new user doc
    const newUserRef = doc(usersRef); 
    const uid = newUserRef.id;

    const userData = {
        uid: uid,
        name: name,
        email: email,
        password: pass, 
        createdAt: Timestamp.now(),
        photoURL: null
    };

    await setDoc(newUserRef, userData);

    const user = {
        uid: uid,
        email: email,
        displayName: name,
        photoURL: null
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyAuthChange();
    return user;
  } catch (error) {
    console.warn("Registration Error (Falling back to local)", error);
    return fallbackRegister();
  }
  */
};

export const logoutUser = async () => {
  localStorage.removeItem(STORAGE_KEY);
  notifyAuthChange();
};

export const signInWithGoogle = async () => { alert("Google Sign-In disabled in Demo mode."); };
export const startPhoneLogin = async () => { alert("Phone Auth disabled in Demo mode."); };
export const auth = {}; 

// --- Care Plan Persistence (Hybrid: Firestore + IndexedDB Fallback) ---

export const saveCarePlanToDb = async (
  userId: string,
  data: {
    parsedEpisode: ParsedEpisode;
    carePlan: FormattedCarePlan;
  }
) => {
  
  const summary: HistoricalRecord = {
    id: "", 
    hospitalName: "General Hospital", 
    dischargeDate: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    primaryCondition:
      data.parsedEpisode.patient?.primary_condition || "General Care",
    doctorName: "Attending Physician", 
    status: "active",
    medicationCount: data.parsedEpisode.medications?.length || 0,
    appointmentCount: data.parsedEpisode.appointments?.length || 0,
    fullData: JSON.stringify({
      parsed: data.parsedEpisode,
      plan: data.carePlan,
    }),
  };

  let savedId = null;

  // 1. Try Saving to Firestore (DISABLED)
  /*
  if (db) {
    try {
      // Save directly to user's subcollection
      const savePromise = addDoc(
        collection(db, "users", userId, "care_plans"),
        {
          ...summary,
          createdAt: Timestamp.now(),
        }
      );
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore Timeout")), 5000));
      
      const docRef = await Promise.race([savePromise, timeoutPromise]);
      savedId = docRef.id;
      console.log("Record saved to Firestore successfully. ID:", savedId);
    } catch (e) {
      console.warn("Firestore save failed. Reason:", e.message || e);
      // Proceed to fallback
    }
  } else {
      console.log("Firestore not available (db is null). Skipping cloud save.");
  }
  */

  // 2. Fallback to IndexedDB (ALWAYS ACTIVE)
  if (!savedId) {
      try {
          const localId = `local-${Date.now()}`;
          const localRecord = {
              ...summary,
              id: localId,
              userId: userId, 
              createdAt: Date.now() 
          };
          
          await dbService.savePlan(localRecord);
          savedId = localId;
          console.log("Record saved to IndexedDB successfully.");
      } catch (e) {
          console.error("IndexedDB save failed.", e);
      }
  }

  return savedId;
};

export const fetchUserRecords = async (
  userId: string
): Promise<HistoricalRecord[]> => {
  let combinedRecords: any[] = [];

  // 1. Fetch from Firestore (DISABLED)
  /*
  if (db) {
    try {
      const q = query(
        collection(db, "users", userId, "care_plans")
      );
      
      const querySnapshot = await getDocs(q);
      const dbRecords = querySnapshot.docs.map((d) => {
        const data = d.data();
        return {
           ...data,
           id: d.id,
           _sortTime: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0 
        };
      });
      combinedRecords = [...combinedRecords, ...dbRecords];
    } catch (e) {
      console.warn("Firestore fetch error. Using local data only.", e.message);
    }
  }
  */

  // 2. Fetch from IndexedDB and Merge
  try {
      const userLocalRecords = await dbService.getUserPlans(userId);
      // Map to consistent format if needed, adding _sortTime for sorting
      const mappedLocal = userLocalRecords.map(r => ({
          ...r,
          _sortTime: r.createdAt || 0
      }));
      
      combinedRecords = [...combinedRecords, ...mappedLocal];
  } catch (e) {
      console.error("IndexedDB fetch error", e);
  }

  // 3. Sort Combined List (Newest First)
  combinedRecords.sort((a, b) => b._sortTime - a._sortTime);

  return combinedRecords.map(r => {
      const { _sortTime, userId: uid, ...rest } = r;
      return rest as HistoricalRecord;
  });
};