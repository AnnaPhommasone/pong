# Pong

A browser-based Pong game built in TypeScript to explore functional programming, immutable state, and reactive programming principles.

## Project Overview

Pong is a two-player-style arcade game where:

- the user controls the right paddle using the up and down arrow keys
- the computer controls the left paddle by tracking the ball's vertical position
- the ball moves continuously and bounces off walls and paddles
- scores increase when the ball reaches the left or right boundary
- the game ends after a player reaches the win condition

This version is intentionally built around functional patterns rather than imperative DOM mutation. It demonstrates how state can be modeled using immutable updates and stream-based event handling.

## Local Setup

Follow these steps to run the game locally.

### Prerequisites

- Node.js and npm installed
- A modern browser such as Chrome, Edge, or Firefox

### 1. Install dependencies

```bash
npm install
```

### 2. Build the project

```bash
npm run build
```

This compiles the TypeScript source and produces the browser bundle in the `dist` folder.

### 3. Run the game

You can either:

- open `pong.html` directly in your browser, or
- serve the project locally and visit the page in a browser

Example local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/pong.html
```

## Technical Highlights

### Functional programming approach

The game is built around immutable state and pure functions. Instead of mutating existing objects, the code creates new state and body objects whenever the game updates. This keeps functions easier to reason about and avoids side effects during gameplay.

### Reactive programming with RxJS

Keyboard input is modeled as observable streams using RxJS. The game listens for keydown and keyup events, maps those events into movement updates, and merges them into a single stream. The state is then reduced over time with a scan operation, which allows the game to react to player input and animation ticks in a clear, compositional way.

### State management

The core application state includes:

- elapsed time
- left and right paddle positions
- ball position and velocity
- player scores
- game-over status

Each update produces a new state object, and the view is rendered from that state rather than by manually mutating the canvas objects.

### Game design

Key design decisions include:

- using a small `Body` type to represent paddles and the ball
- using a `State` type to hold all current game data
- isolating randomness behind a seeded, deterministic generator
- keeping the render/update logic separate from the state transition logic

## Project Structure

- `pong.ts` — main game logic and state updates
- `pong.html` — game canvas and UI structure
- `style.css` — styling for the game and interface
- `webpack.config.js` — build configuration
- `package.json` — project scripts and dependencies

## Technologies Used

- TypeScript
- RxJS
- SVG for the game rendering
- webpack for bundling
