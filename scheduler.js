// scheduler.js

// Data ===========================================================================================
const appName = "Jar-Jar Binksify";
const configPath = "config/config.json";

// Function declarations ==========================================================================
async function loadJSON(path) {
  const url = browser.runtime.getURL(path);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${appName}: Failed to load JSON from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

async function emitTick() {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab) {
    browser.tabs.sendMessage(tab.id, { type: "tick" }).catch(() => {});
  }
}

// Execute ========================================================================================
async function main() {
  let config;

  try {
    config = await loadJSON(configPath);
  } catch (error) {
    console.error(`${appName}: Failed to load configuration settings`, error);
    return;
  }

  setInterval(emitTick, config.scheduler_period_ms);
}

main();
