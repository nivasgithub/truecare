import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile,
  User,
  ConfirmationResult
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  addDoc,
  Timestamp 
} from "firebase/firestore";
import { ParsedEpisode, FormattedCarePlan, HistoricalRecord } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD1AymB79C_IQ0VROlYhjCeBQGR_KiRM8E",
  authDomain: "caretransia.firebaseapp.com",
  projectId: "caretransia",
  storageBucket: "caretransia.firebasestorage.app",
  messagingSenderId: "1048527218738",
  appId: "1:1048527218738:web:9043ad6bea187cb8d2b42b",
  measurementId: "G-27Q96D8VKF"
};

// Singleton pattern to prevent "Platform browser has already been set" error
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Export types for UI components
export { RecaptchaVerifier };
export type { ConfirmationResult };

// --- Auth Helpers ---

// 1. Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await saveUserToDb(user);
    return user;
  } catch (error) {
    console.error("Google Auth Error", error);
    throw error;
  }
};

// 2. Email/Password Registration
export const registerWithEmail = async (name: string, email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const user = result.user;
    await updateProfile(user, { displayName: name });
    // Manually pass name since updateProfile is async and might not reflect immediately in the user object passed to DB
    await saveUserToDb(user, name); 
    return user;
  } catch (error) {
    console.error("Registration Error", error);
    throw error;
  }
};

// 3. Email/Password Login
export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await saveUserToDb(result.user);
    return result.user;
  } catch (error) {
    console.error("Login Error", error);
    throw error;
  }
};

// 4. Phone Auth Wrapper
// Note: UI must handle RecaptchaVerifier and passing it here
export const startPhoneLogin = async (phoneNumber: string, verifier: RecaptchaVerifier) => {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } catch (error) {
    console.error("Phone Auth Error", error);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

// Internal Helper to sync user to Firestore
const saveUserToDb = async (user: User, displayNameOverride?: string) => {
  const userData = {
    uid: user.uid,
    email: user.email || null,
    name: displayNameOverride || user.displayName || user.phoneNumber || "Anonymous",
    photoURL: user.photoURL || null,
    lastLogin: Timestamp.now()
  };

  // setDoc with merge: true handles updates fine.
  await setDoc(doc(db, "users", user.uid), userData, { merge: true });
};


// --- Database ---

export const saveCarePlanToDb = async (userId: string, data: {
  parsedEpisode: ParsedEpisode,
  carePlan: FormattedCarePlan
}) => {
  try {
    const summary: HistoricalRecord = {
      id: '', // Placeholder, Firestore will gen ID
      hospitalName: "General Hospital", // In real app, extract this from OCR
      dischargeDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      primaryCondition: data.parsedEpisode.patient.primary_condition || "General Care",
      doctorName: "Attending Physician", // In real app, extract this
      status: 'active',
      medicationCount: data.parsedEpisode.medications.length,
      appointmentCount: data.parsedEpisode.appointments.length,
      fullData: JSON.stringify({ parsed: data.parsedEpisode, plan: data.carePlan })
    };

    const docRef = await addDoc(collection(db, "users", userId, "care_plans"), {
      ...summary,
      createdAt: Timestamp.now()
    });
    
    return docRef.id;
  } catch (e) {
    console.error("DB Save Error", e);
    throw e;
  }
};

export const fetchUserRecords = async (userId: string): Promise<HistoricalRecord[]> => {
  try {
    const q = query(
      collection(db, "users", userId, "care_plans"), 
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        hospitalName: d.hospitalName,
        dischargeDate: d.dischargeDate,
        primaryCondition: d.primaryCondition,
        doctorName: d.doctorName,
        status: d.status,
        medicationCount: d.medicationCount,
        appointmentCount: d.appointmentCount,
        fullData: d.fullData
      } as HistoricalRecord;
    });
  } catch (e) {
    console.error("DB Fetch Error", e);
    return [];
  }
};