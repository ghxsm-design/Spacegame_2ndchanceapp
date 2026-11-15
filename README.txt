SECOND CHANCE — MK7 / PHOENIX CAMPAIGN

RUN
1. Open this folder in VS Code.
2. Launch index.html with Live Server, or open index.html in a modern browser.
3. index.html is the only entry point.

CAMPAIGN FLOW
Mission briefing → transfer design → engineering campaign → engineering review
→ pre-launch checks → Earth launch → mandatory stage separation
→ transfer → Mars landing → rover operations → Earth communications
→ mission review board → replay.

MK7 ARCHITECTURE
- app.js is the single live campaign controller and sole owner of campaign state.
- style.css provides the preserved base pixel-art presentation.
- mk7.css provides the active MK7 palette, trajectory, review, and operations UI.
- mk6.js, mk6.css, and mk7.js are retained as legacy reference files only; index.html
  intentionally does not load them, so they cannot overwrite MK7 state or handlers.
- backup_original_mk7 contains an untouched copy of the project before this repair pass.

NOTES
- FAST, STANDARD, and HEAVY LIFT values are fictional game-balancing values.
- The orbit diagram is an educational, game-scaled Sun-centred transfer schematic;
  it is not a trajectory solver or operational flight-planning product.
- All Mars–Earth timing and communication delays are simplified game mechanics.
