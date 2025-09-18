// This file: background.js
// Revision: 1.1.0
// This revision demonstrates enhanced modularity, broader URL format support, and hardened logic.

// === MODULE: YouTube URL Utilities ===
// Modularity & Reusability: This section acts as a self-contained module for URL parsing,
// adhering to the Single Responsibility Principle.

const YOUTUBE_HOSTNAMES = new Set([
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube.com'
]);

/**
 * Parses a YouTube video URL and transforms it into its canonical embed equivalent.
 * Handles various URL formats (watch, shorts, youtu.be, live) and preserves timestamps.
 * @param {string} urlString The original YouTube URL.
 * @returns {string|null} The transformed embed URL, or null if no valid video ID is found or the URL is already an embed link.
 */
function getYouTubeEmbedUrl(urlString) {
  try {
    const url = new URL(urlString);
    const searchParams = url.searchParams;
    let videoId = null;

    // // Do not transform a URL that is already an embed link. This check is crucial.
    if (url.pathname.startsWith('/embed/')) {
      return null;
    }

    // // Handle different hostnames and URL structures to find the video ID.
    // // Using a Set for hostnames is more performant and readable for multiple checks.
    if (YOUTUBE_HOSTNAMES.has(url.hostname)) {
      if (url.pathname === '/watch') {
        videoId = searchParams.get('v');
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.substring('/shorts/'.length);
      } else if (url.pathname.startsWith('/live/')) {
        // // Superset Feature: Added support for /live/ URLs.
        videoId = url.pathname.substring('/live/'.length);
      }
    } else if (url.hostname === 'youtu.be') {
      videoId = url.pathname.substring(1); // // Removes the leading '/'
    }

    // // Truthy/Falsy Values: A strict check for a non-empty videoId string.
    if (!videoId) {
      return null;
    }

    // // Construct the new embed URL, preserving relevant parameters.
    // // Using template literals for clean string construction.
    const newUrl = new URL(`https://www.youtube.com/embed/${videoId}`);

    // // YouTube embed links use 'start' for timestamps, while watch links use 't'.
    // // The 't' parameter can be like '123s', so parseInt correctly extracts the integer value.
    if (searchParams.has('t')) {
      const startTime = parseInt(searchParams.get('t'), 10);
      // // Use !isNaN to ensure we only add the parameter if parsing was successful.
      if (!isNaN(startTime)) {
        newUrl.searchParams.set('start', startTime);
      }
    }

    // // Superset Feature: Preserve playlist context if present.
    if (searchParams.has('list')) {
        const playlistId = searchParams.get('list');
        // // Security: Basic validation for a plausible playlist ID format.
        if (playlistId && /^[a-zA-Z0-9_-]+$/.test(playlistId)) {
            newUrl.searchParams.set('list', playlistId);
        }
    }

    return newUrl.href;
  } catch (error) {
    // // Error Handling: More descriptive error logging for easier debugging.
    console.error(`Error parsing YouTube URL "${urlString}":`, error);
    return null;
  }
}

// === MODULE: Chrome Extension Event Listener ===
// This section handles the interaction with the Chrome Commands API.

/**
 * Main command listener. Fires when the registered hotkey is pressed.
 */
// // Asynchronous Operations: The listener is an async function to allow for `await`.
chrome.commands.onCommand.addListener(async (command) => {
  // // Type Coercion & Equality: Uses strict equality (`===`) to prevent bugs.
  if (command === 'modify_youtube_link') {
    // // Error Handling: A comprehensive try/catch block for all async operations.
    try {
      // // The promise-based version of chrome.tabs.query is used with `await`.
      // // Destructuring gets the first element from the resulting array of tabs.
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      // // `this` Keyword Context: Not a concern here due to arrow functions and async context.
      // // Optional chaining (?.) provides a safe way to access nested properties on potentially undefined objects.
      if (tab?.url) {
        const newUrl = getYouTubeEmbedUrl(tab.url);

        // // Only update the tab if a valid new URL was successfully generated.
        // // This prevents unnecessary page reloads or navigation to a null URL.
        if (newUrl) {
          // // Awaiting the update call ensures the command logic completes before exiting.
          await chrome.tabs.update(tab.id, { url: newUrl });
        }
      }
    } catch (error) {
      console.error(`Error in YT-Embed command handler: ${error}`);
    }
  }
});
