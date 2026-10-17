# Configuration

Settings are in `config.json`. Each feature has an `enabled` boolean and a probability from `0` to `1`.

- `debug`: log audio attempts and successful audio availability.
- `text_replacement.enabled`: turn text replacement on or off.
- `text_replacement.text_replace_probability`: chance for each matching word to be replaced.
- `image_replacement.enabled`: turn webpage image replacement on or off.
- `image_replacement.image_replace_probability`: chance each image is replaced, decided once per image.
- `audio.enabled`: turn scheduled audio on or off.
- `audio.audio_play_probability`: chance of an audio attempt on each scheduler tick.
- `overlays.enabled`: turn scheduled overlays on or off.
- `overlays.overlay_probability`: chance of an overlay attempt on each scheduler tick.
- `scheduler_period_ms`: interval, in milliseconds, for audio and overlay checks. Checks run only on focused, visible pages.

Probability `0` disables an action; `1` makes it certain whenever its check runs.
