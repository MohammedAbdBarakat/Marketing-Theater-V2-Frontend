# Frontend Phase Upgrade Changelog

## Scope
This file records the frontend integration updates applied to align with the upgraded backend workflow:

`intelligence -> war room -> creative -> planning`

## Files Updated
- `app/projects/[id]/run/page.tsx`
- `store/useRunStore.ts`
- `lib/sseClient.ts`
- `lib/api.ts`

## What Was Changed

### 1) Removed legacy selection flow coupling
- Removed dependency on deprecated `waiting_for_selection` and `results[1].candidates` rendering logic in run page.
- Kept `strategy_candidates` as ignored legacy SSE event for backward safety.

### 2) Switched UI flow to backend status-driven routing
- Added centralized status application logic in run page (`applyRunStatus`) to map backend `status_update` directly to UI state.
- Supported statuses:
  - `waiting_for_signals`
  - `waiting_for_strategy_approval`
  - `waiting_for_creative`
  - `waiting_for_events`
  - `running_phase_4`
  - `completed`
  - `running`
  - `unknown`

### 3) Fixed intelligence modal lifecycle
- Intelligence modal now opens/closes by status transitions, not by merely having `intelligenceReport` in snapshot.

### 4) Strategy approval now advances to events stage correctly
- After Strategy Review confirmation:
  1. `confirmStrategy(runId, editedData)`
  2. `selectStrategy(runId, selectedId)`
- This ensures backend emits `campaign_events` and frontend can open events selection modal.

### 5) Events selection now transitions to planning status
- On events confirm (`confirmEventSelection`), frontend now immediately sets status to `running_phase_4` while stream continues.

### 6) Updated run status type contract
- `PhaseStatus` in store now includes upgraded statuses:
  - added: `running_phase_4`, `completed`, `unknown`
  - removed obsolete: `waiting_for_selection`, `waiting_for_creative_approval`

### 7) Fixed SSE event typing for upgraded flow
- Added `campaign_events` to `StreamEvent` union in `lib/sseClient.ts`.

### 8) Relaxed RunSnapshot typing for new backend result shape
- `RunSnapshot.results` changed from strict `Record<string, PhaseResult>` to `Record<string, any>`.
- Added optional `chat_history` and `snapshot` fields to match backend payload reality.

## Frontend Behavior Requirements (Now Enforced)
1. Treat backend `status_update` as the authoritative phase router.
2. Do not infer “waiting for signals” from `intelligenceReport` existence.
3. Do not use deprecated state `waiting_for_selection`.
4. Always call `POST /runs/{runId}/start` on mount/rejoin and follow returned status.
5. Keep events modal tied to `waiting_for_events` + available `campaign_events` payload.

## Verification Performed
- TypeScript compile check passed:
  - `npx tsc --noEmit`

## Notes
- Repository lint currently has many pre-existing global issues unrelated to this phase migration. They were not introduced by these changes.
