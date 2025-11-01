// src/content.js
console.log('[Content] Contact-X content script loaded');

// Listen for message from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_LEAD_DATA") {
    console.log('[Content] Received GET_LEAD_DATA request');
    const data = scrapeLinkedInProfile();
    console.log('[Content] Scraped data:', data);
    sendResponse(data);
  }
  return true; // Keep channel open for async response
});

// Scrapes the profile page
function scrapeLinkedInProfile() {
  // These selectors are specific to LinkedIn and may need updating
  const nameEl = document.querySelector('h1.text-heading-xlarge');
  const titleEl = document.querySelector('div.text-body-medium.break-words');
  
  return {
    name: nameEl ? nameEl.textContent.trim() : "Name not found",
    title: titleEl ? titleEl.textContent.trim() : "Title not found",
    url: window.location.href
  };
}

// --- Draggable Icon Logic ---

function createFloatingIcon() {
  // Don't add if it already exists
  if (document.getElementById('contactx-floating-icon')) {
    return;
  }

  const floatingIcon = document.createElement('div');
  floatingIcon.id = 'contactx-floating-icon';
  floatingIcon.className = 'contactx-floating';
  floatingIcon.innerHTML = `
    <div class="contactx-icon-inner">
      <span class="contactx-icon-text">C-X</span>
    </div>
  `;

  document.body.appendChild(floatingIcon);

  // --- Drag Logic ---
  let isDragging = false;
  let currentX, currentY, initialX, initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  // Use session storage to remember position
  const savedPos = sessionStorage.getItem('contactx-icon-pos');
  if (savedPos) {
    const pos = JSON.parse(savedPos);
    xOffset = pos.x;
    yOffset = pos.y;
    setTranslate(xOffset, yOffset, floatingIcon);
  }

  floatingIcon.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target === floatingIcon || e.target.parentElement === floatingIcon) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, floatingIcon);
    }
  }

  function dragEnd(e) {
    if (!isDragging) return;
    
    // Check if it was a "click" (minimal drag)
    const dragDistance = Math.abs(e.clientX - (initialX + xOffset)) + Math.abs(e.clientY - (initialY + yOffset));
    if (dragDistance < 5) {
      handleIconClick();
    }
    
    isDragging = false;
    sessionStorage.setItem('contactx-icon-pos', JSON.stringify({ x: xOffset, y: yOffset }));
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
  
  // --- Click (Save) Logic ---
  async function handleIconClick() {
    console.log('[Content] Floating icon clicked - quick save');
    
    // First, check if user is logged in by reading from storage
    chrome.storage.local.get(['userId'], async (result) => {
      if (!result.userId) {
        showNotification('Please log in to Contact-X first', 'error');
        // Maybe open the dashboard to prompt login?
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
        return;
      }

      floatingIcon.classList.add('contactx-saving');
      const leadData = scrapeLinkedInProfile();

      try {
        // Send data to background script to be saved
        const response = await chrome.runtime.sendMessage({
          type: "SAVE_LEAD",
          data: leadData,
          userId: result.userId
        });
        
        if (response.success) {
          floatingIcon.classList.remove('contactx-saving');
          floatingIcon.classList.add('contactx-saved');
          floatingIcon.innerHTML = `<div class="contactx-icon-inner"><span class="contactx-checkmark">?</span></div>`;
          
          setTimeout(() => {
            floatingIcon.classList.remove('contactx-saved');
            floatingIcon.innerHTML = `<div class="contactx-icon-inner"><span class="contactx-icon-text">C-X</span></div>`;
          }, 2000);
        } else {
          throw new Error(response.message || 'Save failed');
        }
      } catch (e) {
        console.error('[Content] Error saving lead:', e);
        floatingIcon.classList.remove('contactx-saving');
        showNotification('Error: ' + e.message, 'error');
      }
    });
  }

  // Helper to show a notification on the page
  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `contactx-notification contactx-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('contactx-notification-show'), 10);
    setTimeout(() => {
      notification.classList.remove('contactx-notification-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Run the function to create the icon
createFloatingIcon();