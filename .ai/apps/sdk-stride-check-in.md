# SDK Stride Check-In

**Repo**: [metaversecloud-com/sdk-stride-check-in](https://github.com/metaversecloud-com/sdk-stride-check-in)
**Local**: `/Users/dliebeskind/Github/topia-app-directory/sdk-stride-check-in/`
**Quality**: Medium — clean admin settings with input sanitization, ranking system, but GET for mutations, race conditions, heavy inline styles, no tests
**SDK Version**: `@rtsdk/topia@^0.15.8` (older)

## What It Does

A check-in app for Stride schools. Visitors check in (once or daily) by clicking a key asset. Tracks check-ins by user with school associations, supports competitive school rankings with SVG leaderboard image generation, and admin-configurable settings.

### User Flow

1. Click key asset -> drawer opens
2. See title + description + "Check In" button
3. Click to check in -> toast notification in-world
4. If school rankings enabled -> SVG podium image + ranked school list

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-state` | Game state + admin status |
| GET | `/api/check-in` | Record check-in (note: GET for mutation) |
| GET | `/api/has-checked-in` | Check if visitor already checked in |
| GET | `/api/checked-in-users` | Admin: all check-in records |
| GET | `/api/settings` | Get settings (admin gets full, users get subset) |
| PUT | `/api/settings` | Admin: update settings with sanitization |
| PUT | `/api/reset` | Admin: reset all data |
| GET | `/api/rankings` | School rankings (30s cache) |
| GET | `/api/leaderboard-image` | SVG image of top 3 schools |

## Data Structures

### Dropped Asset Data Object
```typescript
{
  checkedInUsers?: CheckInRecord[];
  totalCheckIns?: number;
  settings?: AppSettings;
}

interface CheckInRecord {
  profileId: string;
  date: string;
  schoolIds: string[];
  schoolNames: string[];
}

interface AppSettings {
  title: string;           // Max 100 chars
  description: string;     // Max 500 chars
  checkInDaily: boolean;   // false = one-time, true = once per day
  showSchoolRankings: boolean;
}
```

## Key Patterns

### Input Sanitization on Settings Update
```typescript
const sanitizedSettings: Partial<AppSettings> = {};
if (typeof updates.title === "string") {
  sanitizedSettings.title = updates.title.trim().slice(0, 100);
}
if (typeof updates.description === "string") {
  sanitizedSettings.description = updates.description.trim().slice(0, 500);
}
if (typeof updates.checkInDaily === "boolean") {
  sanitizedSettings.checkInDaily = updates.checkInDaily;
}
```

### Check-In Mode Flexibility
```typescript
const canCheckIn = (existingCheckIn, checkInDaily, now): boolean => {
  if (!existingCheckIn) return true;
  if (!checkInDaily) return false;
  return !isSameDay(new Date(existingCheckIn.date), now);
};
```

### Dynamic SVG Leaderboard Generation
```typescript
// Server generates SVG with school logos on podium
// Logos loaded from filesystem, converted to base64, embedded in SVG
// 30-second in-memory cache
```

### School Consolidation Logic
```typescript
// CAVA schools (9 IDs) merged under single "CAVA" entry
// FLCAA schools (3 IDs) merged under single "FLCAA" entry
```

### Rank Assignment with Tie Handling
```typescript
let currentRank = 1;
for (let i = 0; i < sortedSchools.length; i++) {
  if (i > 0 && sortedSchools[i].checkInCount < sortedSchools[i - 1].checkInCount) {
    currentRank = i + 1;
  }
  sortedSchools[i].rank = currentRank;
}
```

## RPG Relevance

- **Daily check-in mechanics**: Once vs daily modes — RPG daily login rewards
- **Input sanitization pattern**: Server-side validation — safe admin content management
- **In-memory caching with TTL**: 30-second cache for rankings — performance optimization
- **SVG generation**: Dynamic image creation — custom visual feedback
- **School/team grouping**: Consolidation logic — RPG team/faction system

## Weaknesses

- `GET /check-in` for mutation (should be POST)
- No locking on check-in writes (race condition with concurrent users)
- Legacy balloon-pump code in client constants (dead code)
- Heavy inline styles (violates SDK CSS guidelines)
- Older SDK version (0.15.8)
- No tests
