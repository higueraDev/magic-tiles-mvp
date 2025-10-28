# Magic Tiles MVP

A minimal rhythm tapping game: tiles fall toward a hit line; tap them in time. A miss or wrong tap ends the run.

## Features
- 4 lanes, randomly generated tiles.
- Real audio playback (`assets/audio/song.mp3`).
- Scoring: +10 per correct tile.
- Miss or incorrect tap = game over.
- Local top 5 scores saved in `localStorage`.
- Responsive canvas sizing.
 
## Running
Open `index.html` in any modern browser (desktop or mobile). No build step required.

Optionally serve via a static server for localStorage usage consistency:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Structure
```text
index.html       # UI screens & canvas
styles.css       # Basic styling
src/game.js      # Core game logic
assets/audio/    # (Place real audio files here if desired)
```

## Customization
- Adjust `laneCount`, `tileSpacingMs`, and `hitWindowMs` in `src/game.js`.
- Swap audio: replace `assets/audio/song.mp3` with another file (keep same name or update path in `startAudio()`).
- Modify scroll speed via `getScrollSpeedPxPerMs()`.
- Provide authored charts by replacing `generateTiles()` with JSON-driven timestamps.
 
## Tile Generation Logic
Tiles spaced every `tileSpacingMs` until ~0.8s before song end (duration derived from real audio metadata). Each assigned a random lane.

## Reset Behavior
`resetGame()` regenerates tiles, resets score/state, starts audio, and enters play loop.

## Roadmap Ideas
- Timing accuracy tiers (Perfect/Good/Miss).
- Combo multiplier.
- Pre-authored charts (JSON timestamps).
- Multiple songs selection screen.
- Pause/Resume.
- Mobile vibration feedback.

## License
MIT
