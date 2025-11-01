// src/popup.js
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const authStatus = document.getElementById('auth-status');
const mainContent = document.getElementById('main-content');
const loginContent = document.getElementById('login-content');
const openDashboardBtn = document.getElementById('open-dashboard-btn');
const saveLeadBtn = document.getElementById('save-lead-btn');
const leadNameEl = document.getElementById('lead-name');
const leadTitleEl = document.getElementById('lead-title');

let currentUserId = null; 
let currentUserEmail = null;

// 1. Check for Authentication in Chrome's Storage
chrome.storage.local.get(['userId', 'userEmail'], (result) => {
  if (result.userId && result.userEmail) {
    // User IS logged in
    console.log("Auth success from storage:", result.userEmail);
    currentUserId = result.userId;
    currentUserEmail = result.userEmail;

    authStatus.innerHTML = `<span>Logged in as: ${currentUserEmail}</span>`;
    authStatus.className = 'auth-success';
    loginContent.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    scrapeCurrentPage();
  } else {
    // User IS NOT logged in
    console.log("Auth failed, user not logged in.");
    authStatus.innerHTML = `<span>Not Authenticated</span>`;
    authStatus.className = 'auth-error';
    mainContent.classList.add('hidden');
    loginContent.classList.remove('hidden');
  }
});

// 2. Button Listeners
openDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://mitbio.github.io/contactex/index.html' });
});

saveLeadBtn.addEventListener('click', async () => {
  console.log("Save lead button clicked.");
  saveLeadBtn.disabled = true;
  saveLeadBtn.innerHTML = '<div class="spinner"></div><span>Saving...</span>';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const leadData = {
    name: leadNameEl.textContent,
    title: leadTitleEl.textContent,
    url: tab.url
  };

  try {
    // Send data to background.js
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_LEAD",
      data: leadData,
      userId: currentUserId 
    });
    
    if (response.success) {
      saveLeadBtn.innerHTML = `<span>? Saved!</span>`;
    } else {
      console.error("Save failed:", response.message);
      saveLeadBtn.innerHTML = `<span>Error</span>`;
    }
  } catch (e) {
    console.error("Error sending message:", e);
    saveLeadBtn.innerHTML = `<span>Error</span>`;
  }
});

// 3. Scrape Page Function
async function scrapeCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes("linkedin.com/in/")) {
    leadNameEl.textContent = "Not a LinkedIn Profile";
    leadTitleEl.textContent = "Navigate to a profile to save.";
    saveLeadBtn.disabled = true;
    return;
  }
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_LEAD_DATA"
    });
    
    if (response && response.name) {
      leadNameEl.textContent = response.name;
      leadTitleEl.textContent = response.title;
      saveLeadBtn.disabled = false;
    } else {
      leadNameEl.textContent = "Scraping Failed";
      leadTitleEl.textContent = "Refresh the page and try again.";
      saveLeadBtn.disabled = true;
    }
  } catch (e) {
    console.error("Error communicating with content script:", e);
    leadNameEl.textContent = "Error";
    leadTitleEl.textContent = "Please refresh the LinkedIn page.";
    saveLeadBtn.disabled = true;
  }
}