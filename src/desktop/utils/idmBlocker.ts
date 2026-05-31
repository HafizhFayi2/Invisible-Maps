/**
 * idmBlocker.ts
 * 
 * Strict enforcement to prevent IDM (Internet Download Manager) and similar
 * media scrapers from overlaying download buttons on the desktop dashboard.
 * 
 * Rules:
 * 1. Do NOT use <video> tags in the desktop UI.
 * 2. This script actively removes any injected IDM elements from the DOM.
 */

export function initIDMBlocker() {
  if (typeof window === 'undefined') return;

  // Periodically check and remove IDM download panels if they somehow bypass CSS
  setInterval(() => {
    const idmElements = document.querySelectorAll(
      '#idmMdown, #idm_download, #idmdownload, [id^="idm-"], [id^="IDM_"], .idm-download-panel'
    );
    
    idmElements.forEach((el) => {
      try {
        el.remove();
      } catch (e) {
        // ignore
      }
    });

    // Also warn if any video tags are found
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) {
      console.warn('IDM Blocker Warning: <video> tags detected in desktop UI! This may trigger IDM download buttons.');
    }
  }, 2000);
}
