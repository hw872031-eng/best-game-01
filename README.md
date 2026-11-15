# EMBERFALL

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/hw872031-eng/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/hw872031-eng/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon asteroid-defense arcade game for the make.fun best-game-01 competition.
Fly your lantern-ship through a neon asteroid field, shoot the rocks apart,
chain kills into a combo, grab shield / nova-bomb / rapid-fire power-ups, and
survive as many waves as you can.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## How to play

- **WASD / arrow keys** — fly
- **Mouse** — aim
- **Click / Space** — fire
- **E / right-click** — nova bomb (clears the screen, limited)
- **P** — pause, **M** — mute

Rocks split when destroyed. Crystal rocks are worth 250 points. Clearing a
wave pays a bonus and the next wave comes faster and thicker.

## Screenshots

The game stages its own screenshot scenes deterministically from a seed:
`?shot=start|play|battle|end&seed=1` — see `shots.json`.

## Layout

- `main.ts` — entrypoint: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json`
- `game/index.html` — the page
- `game/src/config.js` — all tuning numbers
- `game/src/random.js` — seeded RNG
- `game/src/audio.js` — synthesised WebAudio sound effects
- `game/src/input.js` — keyboard and mouse state
- `game/src/world.js` — the simulation (ship, asteroids, waves, score)
- `game/src/render.js` — all drawing, HUD and screens
- `game/src/shots.js` — deterministic screenshot scenes and autopilot
- `game/src/main.js` — game loop and state machine
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=0sxkwrmb&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
