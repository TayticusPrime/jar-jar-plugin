// Data ===========================================================================================
const replacementStrings = [
  ["the", "ye old"],
  ["your", "thine"],
];

// Function declarations ==========================================================================
function replaceRenderedText(target, replacement) {
  const regex = new RegExp(`\\b${target}\\b`, "gi");
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;

    // Ignore whitespaces
    if (node.nodeValue.trim()) {
      node.nodeValue = node.nodeValue.replace(regex, (match) => {
        if (match[0] === match[0].toUpperCase()) {
          return replacement[0].toUpperCase() + replacement.slice(1);
        } else {
          return replacement;
        }
      });
    }
  }
}

function runReplacements(replacements) {
  replacements.forEach(([target, replacement]) => {
    replaceRenderedText(target, replacement);
  });
}

// Execute ========================================================================================
runReplacements(replacementStrings);
