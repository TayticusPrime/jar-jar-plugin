// main.js

// Data ===========================================================================================
const appName = "Jar-Jar Binksify";
const configPath = "config/config.json";
const replacementStringsPath = "config/replacement-text.json";
const audioManifest = "assets/audio/manifest.json";

let browserAudioAvailable = false;
let audioPlayLock = false;

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

function getRandomFile(files) {
  return files[Math.floor(Math.random() * files.length)];
}

// Text replacements ------------------------------------------------------------------------------
function runReplacements(replacements, config) {
  // Precompile once
  const compiled = replacements.flatMap(({ targets, replacement }) =>
    targets.map((target) => ({
      regex: new RegExp(`\\b${target}\\b`, "gi"),
      replacement,
    })),
  );

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.nodeValue.trim()) continue;

    let text = node.nodeValue;
    for (const { regex, replacement } of compiled) {
      text = text.replace(regex, (match) => {
        if (
          config.text_replace_probability >= 1.0 ||
          Math.random() < config.text_replace_probability
        ) {
          if (match[0] === match[0].toUpperCase()) {
            return replacement[0].toUpperCase() + replacement.slice(1);
          } else {
            return replacement;
          }
        } else {
          return match;
        }
      });
    }

    if (text !== node.nodeValue) node.nodeValue = text;
  }
}

// Audio injection --------------------------------------------------------------------------------
function scheduleAudio(audioFiles, config) {
  setInterval(() => {
    if (
      document.hasFocus() &&
      document.visibilityState === "visible" &&
      (config.audio_play_probability >= 1.0 ||
        Math.random() < config.audio_play_probability)
    ) {
      playRandomAudioClip(audioFiles, config.debug);
    }
  }, config.scheduler_period_ms);
}

function playRandomAudioClip(audioFiles, debug) {
  if (audioPlayLock) return;

  const file = getRandomFile(audioFiles);
  const audio = new Audio(browser.runtime.getURL(`assets/audio/${file}`));

  if (debug) {
    console.debug(
      `playing audio "${file}", browser audio availability: ${browserAudioAvailable}`,
    );
  }

  audioPlayLock = true;

  audio
    .play()
    .then(() => {
      if (!browserAudioAvailable) {
        browserAudioAvailable = true;
        console.info(`${appName}: Audio unlocked`);
      }
    })
    .catch(() => {
      audioPlayLock = false;
    });

  audio.addEventListener("ended", () => {
    audioPlayLock = false;
  });

  audio.addEventListener("error", () => {
    audioPlayLock = false;
  });
}

// Execute ========================================================================================
async function main() {
  let config = null;

  // Load global configuration
  try {
    config = await loadJSON(configPath);
  } catch (error) {
    console.error(`${appName}: Failed to load configuration settings`, error);
    return;
  }

  // Jar-Jar-ify text (replace with Jar-Jar nonsense)
  try {
    const replacementStrings = await loadJSON(replacementStringsPath);
    runReplacements(replacementStrings, config);
  } catch (error) {
    console.error(
      `${appName}: Failed to load and apply replacement text`,
      error,
    );
  }

  // Play Jar-Jar sound-clips
  try {
    const audioFiles = await loadJSON(audioManifest);
    scheduleAudio(audioFiles, config);
  } catch (error) {
    console.error(`${appName}: Failed to launch audio player`, error);
  }
}

// Call main() ====================================================================================
if (document.body) {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main, { once: true });
}
