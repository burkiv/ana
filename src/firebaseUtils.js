// src/firebaseUtils.js
// import { doc, setDoc, getDoc } from 'firebase/firestore';
// import { db } from './firebaseConfig'; // Assuming you have this

const MOCK_FIRESTORE = true; // Set to false when using actual Firebase

/**
 * Saves the memory summary to Firestore (or localStorage mock).
 * @param {string} userId - The ID of the user.
 * @param {string} summary - The conversation summary text.
 */
export const saveMemorySummaryToFirestore = async (userId, summary) => {
  if (!userId || typeof summary !== 'string') {
    console.error('[Firebase] Invalid userId or summary for saving.');
    return;
  }
  console.log(`[Firebase] Attempting to save summary for ${userId}...`);
  if (MOCK_FIRESTORE) {
    localStorage.setItem(`memorySummary_${userId}`, summary);
    console.log(`[Firebase Mock] Summary saved for ${userId}: "${summary.substring(0, 70)}..."`);
  } else {
    // try {
    //   const userDocRef = doc(db, 'userData', userId);
    //   await setDoc(userDocRef, { memorySummary: summary, lastUpdated: new Date() }, { merge: true });
    //   console.log(`[Firebase] Summary successfully saved for ${userId}.`);
    // } catch (error) {
    //   console.error('[Firebase] Error saving memory summary:', error);
    // }
  }
};

/**
 * Retrieves the memory summary from Firestore (or localStorage mock).
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string|null>} The summary text or null if not found/error.
 */
export const getMemorySummaryFromFirestore = async (userId) => {
  if (!userId) {
    console.error('[Firebase] Invalid userId for getting summary.');
    return null;
  }
  console.log(`[Firebase] Attempting to get summary for ${userId}...`);
  if (MOCK_FIRESTORE) {
    const summary = localStorage.getItem(`memorySummary_${userId}`);
    console.log(summary ? `[Firebase Mock] Summary retrieved for ${userId}: "${summary.substring(0, 70)}..."` : `[Firebase Mock] No summary found for ${userId}.`);
    return summary;
  } else {
    // try {
    //   const userDocRef = doc(db, 'userData', userId);
    //   const docSnap = await getDoc(userDocRef);
    //   if (docSnap.exists()) {
    //     const summary = docSnap.data().memorySummary;
    //     console.log(`[Firebase] Summary retrieved for ${userId}.`);
    //     return summary;
    //   } else {
    //     console.log(`[Firebase] No summary document found for ${userId}.`);
    //     return null;
    //   }
    // } catch (error) {
    //   console.error('[Firebase] Error getting memory summary:', error);
    //   return null;
    // }
  }
};