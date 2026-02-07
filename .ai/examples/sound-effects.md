# Sound Effects

> **Source**: sdk-grow-together, sdk-race
> **SDK Methods**: N/A (client-side only)
> **Guide Phase**: Phase 7
> **Difficulty**: Starter

## When to Use

Use this pattern to play audio feedback in response to user actions within the iframe. Since sound effects are played in the browser via the HTML5 Audio API, they are entirely client-side and do not require any SDK server calls. Common scenarios include playing a sound when a visitor performs an action (grow-together plays sounds for planting, watering, and harvesting) and queuing multiple sounds for sequential playback (sdk-race plays a countdown sequence).

## Server Implementation

No server implementation is required for sound effects. Audio is loaded and played entirely on the client side within the iframe. The server's only role (if any) is providing the URLs or filenames of audio assets, which can be included in game state or configuration responses.

### Including Sound URLs in Game State (Optional)

```ts
/**
 * Example of including sound effect URLs in a game state response
 * Allows dynamic sound configuration without client redeployment
 */
import { Request, Response } from "express";
import { errorHandler, getCredentials } from "../utils/index.js";

// Sound effects hosted on S3 or any CDN
const SOUND_EFFECTS = {
  plant: "https://your-bucket.s3.amazonaws.com/sounds/plant.mp3",
  water: "https://your-bucket.s3.amazonaws.com/sounds/water.mp3",
  harvest: "https://your-bucket.s3.amazonaws.com/sounds/harvest.mp3",
  levelUp: "https://your-bucket.s3.amazonaws.com/sounds/level-up.mp3",
  error: "https://your-bucket.s3.amazonaws.com/sounds/error.mp3",
};

export const handleGetGameState = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    // ... fetch other game state ...

    return res.json({
      success: true,
      soundEffects: SOUND_EFFECTS,
      // ... other game state data ...
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetGameState",
      message: "Error loading game state",
      req,
      res,
    });
  }
};
```

## Client Implementation

### Simple Sound Playback (grow-together Style)

Play a single sound effect in response to a user action. This approach uses a global state flag to trigger sounds via `useEffect`.

#### Context State Addition

Add a `soundToPlay` field to your global state:

```ts
// context/types.ts
export interface InitialState {
  // ... other fields
  soundToPlay?: string | null;
}

// Action type
export const SET_SOUND = "SET_SOUND";
```

#### Reducer Update

```ts
// context/GlobalContext.tsx (reducer addition)
case SET_SOUND: {
  return {
    ...state,
    soundToPlay: payload?.soundToPlay ?? null,
  };
}
```

#### Sound Player Hook

```ts
// hooks/useSoundEffect.ts
import { useEffect, useRef, useContext } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@context/GlobalContext";
import { SET_SOUND } from "@context/types";

// Map of sound names to their URLs
const SOUNDS: Record<string, string> = {
  plant: "https://your-bucket.s3.amazonaws.com/sounds/plant.mp3",
  water: "https://your-bucket.s3.amazonaws.com/sounds/water.mp3",
  harvest: "https://your-bucket.s3.amazonaws.com/sounds/harvest.mp3",
  success: "https://your-bucket.s3.amazonaws.com/sounds/success.mp3",
  error: "https://your-bucket.s3.amazonaws.com/sounds/error.mp3",
};

export const useSoundEffect = () => {
  const { soundToPlay } = useContext(GlobalStateContext);
  const dispatch = useContext(GlobalDispatchContext);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!soundToPlay) return;

    const soundUrl = SOUNDS[soundToPlay];
    if (!soundUrl) {
      console.warn(`Unknown sound: ${soundToPlay}`);
      dispatch({ type: SET_SOUND, payload: { soundToPlay: null } });
      return;
    }

    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Play the new sound
    const audio = new Audio(soundUrl);
    audioRef.current = audio;

    audio.play().catch((error) => {
      // Browser may block autoplay if user hasn't interacted yet
      console.warn("Audio playback failed:", error);
    });

    // Clear the sound from state after triggering
    dispatch({ type: SET_SOUND, payload: { soundToPlay: null } });

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundToPlay, dispatch]);
};
```

#### Using the Sound Hook in a Component

```tsx
// pages/Home.tsx or any top-level component
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { SET_SOUND } from "@context/types";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { backendAPI, setErrorMessage } from "@utils";
import { ErrorType } from "@context/types";

export const GardenActions = () => {
  const dispatch = useContext(GlobalDispatchContext);

  // Initialize the sound player hook
  useSoundEffect();

  const handleWaterPlant = async () => {
    try {
      const result = await backendAPI.post("/api/water-plant");
      if (result.data.success) {
        // Trigger the water sound effect
        dispatch({ type: SET_SOUND, payload: { soundToPlay: "water" } });
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  const handleHarvest = async () => {
    try {
      const result = await backendAPI.post("/api/harvest");
      if (result.data.success) {
        dispatch({ type: SET_SOUND, payload: { soundToPlay: "harvest" } });
      }
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
    }
  };

  return (
    <div className="container">
      <button className="btn" onClick={handleWaterPlant}>
        Water Plant
      </button>
      <button className="btn" onClick={handleHarvest}>
        Harvest
      </button>
    </div>
  );
};
```

### Audio Queue Pattern (sdk-race Style)

Play multiple sounds sequentially (e.g., a 3-2-1 countdown). Each sound waits for the previous one to finish before playing.

```ts
// hooks/useAudioQueue.ts
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioQueueOptions {
  /** Delay in ms between sounds (after previous finishes). Default: 0 */
  delayBetween?: number;
  /** Callback when the entire queue finishes playing */
  onQueueComplete?: () => void;
}

export const useAudioQueue = (options: AudioQueueOptions = {}) => {
  const { delayBetween = 0, onQueueComplete } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const queueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      if (queueRef.current.length === 0) {
        setIsPlaying(false);
        onQueueComplete?.();
      }
      return;
    }

    isProcessingRef.current = true;
    setIsPlaying(true);

    const soundUrl = queueRef.current.shift()!;

    try {
      const audio = new Audio(soundUrl);
      currentAudioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch(reject);
      });

      // Optional delay between sounds
      if (delayBetween > 0 && queueRef.current.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetween));
      }
    } catch (error) {
      console.warn("Audio queue playback error:", error);
    }

    isProcessingRef.current = false;
    currentAudioRef.current = null;

    // Process next item in queue
    processQueue();
  }, [delayBetween, onQueueComplete]);

  const enqueue = useCallback(
    (soundUrls: string | string[]) => {
      const urls = Array.isArray(soundUrls) ? soundUrls : [soundUrls];
      queueRef.current.push(...urls);
      processQueue();
    },
    [processQueue],
  );

  const clear = useCallback(() => {
    queueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isProcessingRef.current = false;
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return { enqueue, clear, isPlaying };
};
```

#### Using the Audio Queue for a Countdown

```tsx
// components/RaceCountdown.tsx
import { useAudioQueue } from "@/hooks/useAudioQueue";
import { backendAPI, setErrorMessage } from "@utils";
import { useContext } from "react";
import { GlobalDispatchContext } from "@context/GlobalContext";
import { ErrorType } from "@context/types";

const COUNTDOWN_SOUNDS = [
  "https://your-bucket.s3.amazonaws.com/sounds/countdown-3.mp3",
  "https://your-bucket.s3.amazonaws.com/sounds/countdown-2.mp3",
  "https://your-bucket.s3.amazonaws.com/sounds/countdown-1.mp3",
  "https://your-bucket.s3.amazonaws.com/sounds/go.mp3",
];

export const RaceCountdown = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const { enqueue, isPlaying } = useAudioQueue({
    delayBetween: 200,
    onQueueComplete: async () => {
      // Start the race after countdown finishes
      try {
        await backendAPI.post("/api/start-race");
      } catch (err) {
        setErrorMessage(dispatch, err as ErrorType);
      }
    },
  });

  const handleStartCountdown = () => {
    enqueue(COUNTDOWN_SOUNDS);
  };

  return (
    <button className="btn" onClick={handleStartCountdown} disabled={isPlaying}>
      {isPlaying ? "Starting..." : "Start Race"}
    </button>
  );
};
```

### Muting / Volume Control

```tsx
// components/SoundToggle.tsx
import { useState, createContext, useContext } from "react";

interface SoundContextType {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (v: number) => void;
}

export const SoundContext = createContext<SoundContextType>({
  isMuted: false,
  volume: 1,
  toggleMute: () => {},
  setVolume: () => {},
});

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const toggleMute = () => setIsMuted((prev) => !prev);

  return (
    <SoundContext.Provider value={{ isMuted, volume, toggleMute, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
};

// Updated sound playback that respects mute/volume
export const playSound = (url: string, soundContext: SoundContextType) => {
  if (soundContext.isMuted) return;

  const audio = new Audio(url);
  audio.volume = soundContext.volume;
  audio.play().catch((error) => console.warn("Audio playback failed:", error));
};

// Mute toggle button component
export const SoundToggle = () => {
  const { isMuted, toggleMute } = useContext(SoundContext);

  return (
    <button className="btn btn-icon" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
      <img
        src={
          isMuted
            ? "https://sdk-style.s3.amazonaws.com/icons/mute.svg"
            : "https://sdk-style.s3.amazonaws.com/icons/volume.svg"
        }
        alt={isMuted ? "Unmute" : "Mute"}
      />
    </button>
  );
};
```

## Variations

| App | Use Case | Pattern | Notes |
|-----|----------|---------|-------|
| sdk-grow-together | Action feedback (plant, water, harvest) | Simple global state trigger | One sound at a time, replaced by new actions |
| sdk-race | 3-2-1 countdown sequence | Audio queue with sequential playback | Sounds play in order with delay between |
| sdk-quiz | Correct/incorrect answer ding | Simple one-shot playback | Immediate feedback, no queue needed |
| virtual-pet | Pet interaction sounds | Simple global state trigger | Different sounds per action type |

## Common Mistakes

- **Not handling autoplay restrictions**: Browsers block audio playback until the user has interacted with the page (click, tap, etc.). Always wrap `audio.play()` in a `.catch()` and trigger sounds only after user interaction events.
- **Creating Audio objects without cleanup**: Each `new Audio(url)` allocates browser resources. Always pause and dereference audio objects when components unmount or when sounds are no longer needed.
- **Playing overlapping sounds**: If a user clicks rapidly, multiple audio instances play simultaneously, creating a cacophony. Either stop the previous sound before playing a new one, or use the queue pattern.
- **Hardcoding sound URLs in components**: Store sound URLs in a constants file or fetch them from the server configuration. This makes it easy to update or swap sounds without modifying component code.
- **Ignoring volume and mute preferences**: Always provide a mute toggle. Some users interact with Topia in contexts where audio is inappropriate. Persist mute preference in localStorage if possible.
- **Large audio files**: Keep sound effects short (under 3 seconds) and compressed (MP3, 64-128kbps). Large files cause loading delays and poor user experience, especially on slow connections.

## Related Examples

- [Fire Toast](./fire-toast.md) - Visual notifications that complement audio feedback
- [Particle Effects](./particle-effects.md) - Visual effects that pair well with sound
- [Get Configuration](./get-configuration.md) - Server can provide sound URLs in configuration
