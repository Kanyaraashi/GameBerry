# Wano Farm

A casual mobile farming game prototype set in **Wano Farm**, using the supplied character and farm assets.

## How to Play

1. Open `index.html` in any modern browser (Chrome / Safari / Firefox on phone or desktop).
2. On the **Lobby** you see Luffy, the Wano Farm welcome field, your resources, and the four main buttons.
3. Tap **Farm** to go to your plot grid.
4. Select a tool:
   - **Plant** → tap an empty brown plot (uses 1 energy + 1 seed)
   - **Water** → tap a planted plot (uses 1 energy). Crop grows after a short timer.
   - **Harvest** → tap a glowing ready plot to collect coins.
5. Luffy walks smoothly to the selected plot before planting, watering, or harvesting.
6. Move Luffy with **WASD**, **arrow keys**, or the on-screen direction buttons.
7. Press **Space/E** or tap **Harvest nearby** to walk to and harvest the closest ready crop.
8. Visit the **Shop** to buy more seeds or a better watering can (faster growth).
9. Energy slowly regenerates over time.

## Features Implemented

- Lobby screen with character + resource bar + bottom navigation
- 12-plot farm grid with plant / water / harvest loop
- Smooth frame-synced Luffy movement and walking animation
- Automatic movement to selected plots and nearby harvesting
- Simple economy (coins + energy)
- Shop with 4 items (Tomato, Wheat, Carrot seeds + Better Can)
- Level-up chance on harvest
- Toast notifications
- Settings (reset progress)
- Mobile-first responsive design matching the bright, friendly palette

## Assets Used

The visual style (colours, mood, character concept) matches the generated assets:

- Character “Luffy” (standing + watering-can variation)
- Game Lobby composition
- Farm environment background
- Collectable items (Tomato, Wheat, Carrot, Watering Can)

The character is rendered from `gear5.png` in both the lobby and farm views. Crops and shop items continue to use large emoji + CSS for instant playability.

## Files

- `index.html` – structure
- `styles.css` – full mobile UI matching the Sunny Sprout palette
- `game.js` – complete game logic
- `README.md` – this file

## Next Steps for a Full Game

- Replace emoji with the real transparent PNGs
- Add simple particle effects on harvest
- Save progress to localStorage
- Add sound effects
- Expand to multiple farm areas / animals
- Port to a real engine (Unity, Godot, or Capacitor for native apps)

Enjoy farming! 🌱
