# Overlays

Place overlay images here and configure them in `manifest.json`:

- `image`: image path relative to this folder.
- `animation`: `fade` or `pan_in`.
- `size`: image width as a fraction of viewport width.
- `x_position`, `y_position`: anchors for `fade` overlays (`left`/`middle`/`right` and `top`/`middle`/`bottom`). `pan_in` chooses a random edge and position.
- `max_height`: fraction of the scaled image dimension to travel during `pan_in`.
- `in_out_duration`, `dwell_duration`: animation and hold times in milliseconds.

Overlays are selected randomly on scheduler ticks when enabled. Only one overlay runs at a time per page.
