# Jar-Jar Binksify

A browser extension that replaces page text and images, and randomly plays audio and displays image overlays.

## Setup

Run `npm install`, then load this project folder as an unpacked extension in your browser. There is no build step. After changing code, config, or manifests, reload the extension and refresh open pages.

## Project files

- `main.js`: content replacement and scheduling logic.
- `config/`: feature toggles and probabilities; see [config/README.md](config/README.md).
- `assets/audio/`: audio clips and their manifest.
- `assets/images/`: replacement images and their manifest.
- `assets/overlays/`: overlay images and animation settings.
