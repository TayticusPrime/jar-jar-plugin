// Data ===========================================================================================
const temperature = 1.0;
const replacementStringsPath = "./replacement-text.json";

// Function declarations ==========================================================================
async function loadJSON(path) {
  const response = await fetch(browser.runtime.getURL(path));
  return await response.json();
}

function runReplacements(replacements) {
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
        if (temperature >= 1.0 || Math.random() < temperature) {
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

// Execute ========================================================================================
async function main() {
  const replacementStrings = await loadJSON(replacementStringsPath);
  runReplacements(replacementStrings);
}

// Call main() ====================================================================================
if (document.body) {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main, { once: true });
}
