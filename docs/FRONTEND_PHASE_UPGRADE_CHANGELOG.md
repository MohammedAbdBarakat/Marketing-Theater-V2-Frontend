# Frontend Phase Upgrade Changelog

## Scope
This file records the frontend integration updates applied to align with the upgraded backend workflow:

`intelligence -> strategy lock (2a) -> skeleton distribution (2b) -> creative fill (3)`

## Files Updated
- `app/projects/[id]/run/page.tsx`
- `store/useRunStore.ts`
- `lib/sseClient.ts`
- `lib/api.ts`

## What Was Changed

### 1) Removed legacy selection flow coupling
- Removed dependency on deprecated `waiting_for_selection` and `results[1].candidates` rendering logic in run page.
- Removed run-page coupling to legacy `selectStrategy`/`confirm-events` path.
- Kept `strategy_candidates` and `campaign_events` as ignored legacy SSE events for backward safety.

### 2) Switched UI flow to backend status-driven routing
- Added centralized status application logic in run page (`applyRunStatus`) to map backend `status_update` directly to UI state.
- Supported statuses:
  - `waiting_for_signals`
  - `waiting_for_strategy_approval`
  - `waiting_for_creative`
  - `completed`
  - `running`
  - `unknown`

### 3) Fixed intelligence modal lifecycle
- Intelligence modal now opens/closes by status transitions, not by merely having `intelligenceReport` in snapshot.

### 4) Strategy approval now advances to Stage 2B correctly
- After Strategy Review confirmation:
  1. `confirmStrategy(runId, editedData)`
  2. Wait for backend-driven skeleton generation stream (`skeleton_day_progress`, `skeleton_day_planned`)
- Frontend no longer triggers `selectStrategy` or events selection from run page.

### 5) Stage-aware skeleton handling and hydration
- Run page now hydrates skeleton days from `results.skeleton` on load.
- SSE parsing now supports both payload contracts:
  - legacy: `ev.data.plan`
  - new/flat: `ev.data`
- Calendar entries are deduplicated on replay/reconnect.

### 6) Updated run status type contract
- `PhaseStatus` in store now includes upgraded statuses:
  - added: `running_phase_4`, `completed`, `unknown`
  - removed obsolete: `waiting_for_selection`, `waiting_for_creative_approval`

### 7) Updated SSE event typing for upgraded flow
- Added `skeleton_day_progress` to `StreamEvent`.
- Updated mock SSE flow so Phase 2 transitions cleanly into Phase 3 and ends at `waiting_for_creative`.

### 8) Relaxed RunSnapshot typing for new backend result shape
- `RunSnapshot.results` changed from strict `Record<string, PhaseResult>` to `Record<string, any>`.
- Added optional `chat_history` and `snapshot` fields to match backend payload reality.

## Frontend Behavior Requirements (Now Enforced)
1. Treat backend `status_update` as the authoritative phase router.
2. Do not infer “waiting for signals” from `intelligenceReport` existence.
3. Do not use deprecated state `waiting_for_selection`.
4. Always call `POST /runs/{runId}/start` on mount/rejoin and follow returned status.
5. Keep run-page flow bounded to 3 phases; do not auto-trigger Phase 4 selection endpoints.

## Verification Performed
- TypeScript compile check passed:
  - `npx tsc --noEmit`

## Notes
- Repository lint currently has many pre-existing global issues unrelated to this phase migration. They were not introduced by these changes.
