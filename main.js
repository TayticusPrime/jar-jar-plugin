// main.js

// Data ===========================================================================================
const appName = "Jar-Jar Binksify";
const configPath = "config/config.json";
const replacementStringsPath = "config/replacement-text.json";
const audioManifest = "assets/audio/manifest.json";

let audioInitialized = false;
let mediaLock = false;

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

function runReplacements(replacements, config) {
  // Precompile once
  const compiled = replacements.map(({ target, replacement }) => ({
    regex: new RegExp(`\\b${target}\\b`, "gi"),
    replacement,
  }));

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

async function unlockAudio(audioFiles) {
  if (!unlockAudio.initialized) {
    unlockAudio.initialized = true;

    const unlockAudioHandler = () => unlockAudio(audioFiles);

    document.addEventListener("mousemove", unlockAudioHandler, { once: true });
    document.addEventListener("click", unlockAudioHandler, { once: true });
    document.addEventListener("keydown", unlockAudioHandler, { once: true });
    document.addEventListener("scroll", unlockAudioHandler, { once: true });
  } else {
    if (audioInitialized) return;
    audioInitialized = true;

    const unlock = new Audio(
      browser.runtime.getURL(`assets/audio/${audioFiles[0]}`),
    );
    unlock.volume = 0;
    unlock
      .play()
      .then(() => {
        unlock.pause();
        unlock.currentTime = 0;
        // console.log(`${appName}: Audio unlocked successfully`);
      })
      .catch((error) => {
        console.error(`${appName}: Unlock play failed`, error);
      });
  }
}

function playRandomAudioClip(audioFiles) {
  if (mediaLock) return;

  const file = getRandomFile(audioFiles);
  const audio = new Audio(browser.runtime.getURL(`assets/audio/${file}`));

  mediaLock = true;

  audio.play().catch((error) => {
    console.error(`${appName}: Failed to play audio clip`, error);
    mediaLock = false;
  });

  audio.addEventListener("ended", () => {
    mediaLock = false;
  });

  audio.addEventListener("error", () => {
    mediaLock = false;
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
    // Prime audio
    const audioFiles = await loadJSON(audioManifest);
    unlockAudio(audioFiles);

    // Attach to scheduler
    browser.runtime.onMessage.addListener((message) => {
      if (
        message.type === "tick" &&
        document.hasFocus() &&
        (config.audio_play_probability >= 1.0 ||
          Math.random() < config.audio_play_probability)
      ) {
        playRandomAudioClip(audioFiles);
      }
    });
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
