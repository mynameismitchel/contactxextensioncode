// src/background.js
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log('[Background] Contact-X service worker initialized');

// Listen for login message from the dashboard website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received external message:', request);
  
  if (request.type === "AUTH_SUCCESS" && request.user) {
    console.log('[Background] Auth success from website:', request.user);
    // Save the user data to Chrome's local storage for the popup
    chrome.storage.local.set({
      userId: request.user.uid,
      userEmail: request.user.email
    }, () => {
      console.log('[Background] User data saved to storage');
      sendResponse({ success: true, message: "Auth data received." });
    });
  }
  return true; // Keep message port open for async response
});

// Listen for "SAVE_LEAD" message from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received internal message:', request);
  
  if (request.type === "SAVE_LEAD") {
    const userId = request.userId;
    
    if (userId) {
      // Call the function to save to Firestore
      saveLeadToFirestore(request.data, userId)
        .then(() => {
          console.log('[Background] Lead saved successfully');
          sendResponse({ success: true, message: "Lead saved!" });
        })
        .catch(e => {
          console.error('[Background] Error saving lead:', e);
          sendResponse({ success: false, message: e.message });
        });
    } else {
      console.error('[Background] No user ID provided');
      sendResponse({ success: false, message: "User not logged in." });
    }
  }
  
  return true; // Keep message port open for async response
});

// The function that saves to Firestore
async function saveLeadToFirestore(leadData, userId) {
  if (!userId) {
    throw new Error("User ID is missing.");
  }
  
  try {
    const docRef = await addDoc(collection(db, `users/${userId}/leads`), {
      name: leadData.name,
      title: leadData.title,
      url: leadData.url,
      savedAt: serverTimestamp(),
      status: "New" 
    });
    console.log('[Background] Lead saved with ID:', docRef.id);
  } catch (e) {
    console.error('[Background] Firestore error:', e);
    throw e; 
  }
}