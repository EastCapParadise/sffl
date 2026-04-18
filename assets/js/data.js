// ============================================================
// SFFL - Data Loader
// Fetches data.json and makes it available globally
// ============================================================

let SFFL_DATA = null;

async function loadData() {
  try {
    const response = await fetch('data/data.json?v=' + Date.now());
    SFFL_DATA = await response.json();
    return SFFL_DATA;
  } catch (error) {
    console.error('Failed to load SFFL data:', error);
    return null;
  }
}