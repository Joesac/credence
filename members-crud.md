# Members CRUD Implementation

## Goal
Enable full CRUD operations for members across the Electron backend and Angular renderer, including a soft-delete flag and IPC wiring.

## Tasks
- [ ] **Schema update:** Add `is_deleted` column (default 0) before `is_synced` in `electron/database/members.ts` and document its purpose. → Verify by reopening the file and confirming the SQL definition.
- [ ] **Electron members helpers:** Create `Members` domain helpers (`types`, CRUD functions with soft-delete) in `electron/functions/members.ts`, plus any supporting constants/channels in `electron/constants.ts` and IPC handlers in `electron/main.ts`/`electron/preload.ts`/`src/decl.d.ts`. Ensure queries filter out deleted rows by default and include production comments. → Verify by reading the updated files and ensuring IPC wiring compiles.
- [ ] **Angular member service:** Implement `MemberService` in `src/app/pages/portal/members/service/member-service.ts` that extends the shared `Database` executor and provides typed methods for list, fetch, create, update, and soft delete via IPC. → Verify by checking the service file and ensuring it imports the correct Electron API types/keys.

## Done When
- [ ] Members schema contains `is_deleted` with default 0 semantics documented.
- [ ] Electron backend exposes sanitized CRUD helpers plus IPC handlers for members, respecting soft deletes.
- [ ] Angular `MemberService` offers corresponding methods wired through the preload bridge.
