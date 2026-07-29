# Hybrid Athlete

Personal single-user PWA for the 12-week hybrid athlete program.

## Phase A (current)

- Today screen (readiness ring, session card, week strip, quick logs)
- Full workout logging for Upper A/B, Lower A/B, Zone 2, Football
- IndexedDB local-first storage (offline)
- Installable PWA shell

## Run

```bash
npm install
npm run dev
```

Open the local URL on your phone (same network) or desktop. Use the browser “Add to Home Screen” / Install prompt for the PWA.

## Data

All logs live in IndexedDB (`hybrid-athlete`). Program week is computed from `programStartDate` in settings (defaults to the Monday of the week you first open the app = Week 1).
