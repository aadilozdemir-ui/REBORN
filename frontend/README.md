# LevelUp OneButton

A React + TypeScript mobile-first self-improvement app with a single control button.

## Features

- **2-Level System**: 
  - Level 1: Focus Mode (5 minutes)
  - Level 2: Deep Work (15 minutes)
- **Single Button Control**: One fixed button at the bottom for all interactions
- **Tap to Start/Pause**: Single tap starts or pauses the session
- **Hold 2 Seconds**: Long press switches between levels
- **Real-time Timer**: Countdown timer showing remaining time
- **Progress Tracking**: Visual progress bar and percentage
- **Status Messages**: Dynamic messages showing current state

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Configuration

Make sure the backend server is running on `http://localhost:3001` (or update `API_BASE_URL` in `App.tsx`).

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Mobile Features

- Mobile-first responsive design
- Touch-optimized interactions
- Fixed bottom button (full width on small devices)
- Smooth animations and transitions
- Prevents accidental text selection
- Optimized for portrait and landscape orientations
