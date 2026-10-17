// main.js

// Data ===========================================================================================
const appName = "Jar-Jar Binksify";
const configPath = "config/config.json";
const replacementStringsPath = "config/replacement-text.json";
const audioManifest = "assets/audio/manifest.json";
const imageManifest = "assets/images/manifest.json";
const overlayManifest = "assets/overlays/manifest.json";

let browserAudioAvailable = false;
let audioPlayLock = false;
let overlayPlayLock = false;

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

// Image replacement -----------------------------------------------------------------------------
function replaceImages(imageFiles, config) {
  if (imageFiles.length === 0) return;

  const processedImages = new WeakSet();
  const replaceImage = (image) => {
    if (image.hasAttribute("data-jar-jar-overlay")) return;
    if (processedImages.has(image)) return;
    processedImages.add(image);

    if (
      !(
        config.image_replace_probability >= 1.0 ||
        Math.random() < config.image_replace_probability
      )
    ) {
      return;
    }

    image.removeAttribute("srcset");
    image
      .closest("picture")
      ?.querySelectorAll("source")
      .forEach((source) => source.removeAttribute("srcset"));
    image.src = browser.runtime.getURL(
      `assets/images/${getRandomFile(imageFiles)}`,
    );
  };
  const scanNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches("img")) replaceImage(node);
    node.querySelectorAll("img").forEach(replaceImage);
  };

  document.querySelectorAll("img").forEach(replaceImage);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(scanNode);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Overlay injection -----------------------------------------------------------------------------
function scheduleOverlays(overlays, config) {
  setInterval(() => {
    if (
      document.hasFocus() &&
      document.visibilityState === "visible" &&
      (config.overlays.overlay_probability >= 1.0 ||
        Math.random() < config.overlays.overlay_probability)
    ) {
      showRandomOverlay(overlays);
    }
  }, config.scheduler_period_ms);
}

async function showRandomOverlay(overlays) {
  if (overlayPlayLock || overlays.length === 0) return;

  overlayPlayLock = true;
  const overlay = getRandomFile(overlays);
  const image = document.createElement("img");
  const container = document.createElement("div");

  try {
    image.src = new URL(
      overlay.image,
      browser.runtime.getURL(overlayManifest),
    ).href;
    await image.decode();

    if (!document.hasFocus() || document.visibilityState !== "visible") return;

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    let imageWidth = Math.min(overlay.size * viewportWidth, viewportWidth);
    let imageHeight = imageWidth * (image.naturalHeight / image.naturalWidth);
    const panSide =
      overlay.animation === "pan_in"
        ? getRandomFile(["top", "bottom", "left", "right"])
        : null;
    const rotation =
      panSide === "top"
        ? 180
        : panSide === "left"
          ? 90
          : panSide === "right"
            ? -90
            : 0;
    const longestSide = Math.max(imageWidth, imageHeight);
    const scale = Math.min(
      1,
      viewportWidth / longestSide,
      viewportHeight / longestSide,
    );
    imageWidth *= scale;
    imageHeight *= scale;

    const finalWidth =
      Math.abs(Math.cos((rotation * Math.PI) / 180)) * imageWidth +
      Math.abs(Math.sin((rotation * Math.PI) / 180)) * imageHeight;
    const finalHeight =
      Math.abs(Math.sin((rotation * Math.PI) / 180)) * imageWidth +
      Math.abs(Math.cos((rotation * Math.PI) / 180)) * imageHeight;

    Object.assign(container.style, {
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      opacity: overlay.animation === "fade" ? "0" : "1",
    });
    Object.assign(image.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    });
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.setAttribute("data-jar-jar-overlay", "");
    container.appendChild(image);

    let entryOffset = { x: 0, y: 0 };
    let restingOffset = { x: 0, y: 0 };

    if (panSide === "top") {
      container.style.left = `${Math.random() * Math.max(0, viewportWidth - finalWidth)}px`;
      container.style.top = "0";
      const travel =
        finalHeight * Math.max(0, Math.min(overlay.max_height ?? 1, 1));
      entryOffset = { x: 0, y: -finalHeight };
      restingOffset = { x: 0, y: -finalHeight + travel };
    } else if (panSide === "bottom") {
      container.style.left = `${Math.random() * Math.max(0, viewportWidth - finalWidth)}px`;
      container.style.bottom = "0";
      const travel =
        finalHeight * Math.max(0, Math.min(overlay.max_height ?? 1, 1));
      entryOffset = { x: 0, y: finalHeight };
      restingOffset = { x: 0, y: finalHeight - travel };
    } else if (panSide === "left") {
      container.style.left = "0";
      container.style.top = `${Math.random() * Math.max(0, viewportHeight - finalHeight)}px`;
      const travel =
        finalWidth * Math.max(0, Math.min(overlay.max_height ?? 1, 1));
      entryOffset = { x: -finalWidth, y: 0 };
      restingOffset = { x: -finalWidth + travel, y: 0 };
    } else if (panSide === "right") {
      container.style.right = "0";
      container.style.top = `${Math.random() * Math.max(0, viewportHeight - finalHeight)}px`;
      const travel =
        finalWidth * Math.max(0, Math.min(overlay.max_height ?? 1, 1));
      entryOffset = { x: finalWidth, y: 0 };
      restingOffset = { x: finalWidth - travel, y: 0 };
    } else {
      if (overlay.x_position === "left") {
        container.style.left = "0";
      } else if (overlay.x_position === "middle") {
        container.style.left = `calc(50% - ${finalWidth / 2}px)`;
      } else if (overlay.x_position === "right") {
        container.style.right = "0";
      }

      if (overlay.y_position === "top") {
        container.style.top = "0";
      } else if (overlay.y_position === "middle") {
        container.style.top = `calc(50% - ${finalHeight / 2}px)`;
      } else if (overlay.y_position === "bottom") {
        container.style.bottom = "0";
      }
    }

    const transformAtOffset = ({ x, y }) => `translate(${x}px, ${y}px)`;
    container.style.transform = transformAtOffset(entryOffset);
    document.body.appendChild(container);

    if (overlay.animation === "fade") {
      await container.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: overlay.in_out_duration,
        fill: "forwards",
      }).finished;
    } else if (overlay.animation === "pan_in") {
      await container.animate(
        [
          { transform: transformAtOffset(entryOffset) },
          { transform: transformAtOffset(restingOffset) },
        ],
        { duration: overlay.in_out_duration, fill: "forwards" },
      ).finished;
    }

    await new Promise((resolve) => setTimeout(resolve, overlay.dwell_duration));

    if (overlay.animation === "fade") {
      await container.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: overlay.in_out_duration,
        fill: "forwards",
      }).finished;
    } else if (overlay.animation === "pan_in") {
      await container.animate(
        [
          { transform: transformAtOffset(restingOffset) },
          { transform: transformAtOffset(entryOffset) },
        ],
        { duration: overlay.in_out_duration, fill: "forwards" },
      ).finished;
    }
  } catch (error) {
    console.error(`${appName}: Failed to display overlay`, error);
  } finally {
    container.remove();
    overlayPlayLock = false;
  }
}

// Audio injection --------------------------------------------------------------------------------
function scheduleAudio(audioFiles, config) {
  setInterval(() => {
    if (
      document.hasFocus() &&
      document.visibilityState === "visible" &&
      (config.audio.audio_play_probability >= 1.0 ||
        Math.random() < config.audio.audio_play_probability)
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
  if (config.text_replacement.enabled) {
    try {
      const replacementStrings = await loadJSON(replacementStringsPath);
      runReplacements(replacementStrings, config.text_replacement);
    } catch (error) {
      console.error(
        `${appName}: Failed to load and apply replacement text`,
        error,
      );
    }
  }

  // Replace webpage images
  if (config.image_replacement.enabled) {
    try {
      const imageFiles = await loadJSON(imageManifest);
      replaceImages(imageFiles, config.image_replacement);
    } catch (error) {
      console.error(`${appName}: Failed to load and replace images`, error);
    }
  }

  // Show scheduled overlays
  if (config.overlays.enabled) {
    try {
      const overlays = await loadJSON(overlayManifest);
      scheduleOverlays(overlays, config);
    } catch (error) {
      console.error(`${appName}: Failed to load overlay manifest`, error);
    }
  }

  // Play Jar-Jar sound-clips
  if (config.audio.enabled) {
    try {
      const audioFiles = await loadJSON(audioManifest);
      scheduleAudio(audioFiles, config);
    } catch (error) {
      console.error(`${appName}: Failed to launch audio player`, error);
    }
  }
}

// Call main() ====================================================================================
if (document.body) {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main, { once: true });
}
