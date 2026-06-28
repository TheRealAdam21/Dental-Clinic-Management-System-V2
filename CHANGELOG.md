# Changelog - Dental Clinic Management System V2

## 2026-05-07 - Calendar UX + Notification Infrastructure

### Added
- Full-width appointment calendar grid in `src/components/AppointmentScheduler.tsx`.
- Date-click popup card/dialog with per-day appointment details (time, full patient name, service).
- "Schedule Patient on This Date" action to prefill the scheduler from the selected calendar date.
- In-app reminder hook for dentist users (`src/hooks/useAppointmentNotifications.ts`) for:
  - 2-hour appointment reminders
  - 8:00 AM Asia/Manila daily overview
- Push notification scaffolding:
  - Browser push handler: `public/push-handler.js`
  - Push registration hook: `src/hooks/usePushNotifications.ts`
  - Supabase edge functions:
    - `supabase/functions/register-push-subscription/index.ts`
    - `supabase/functions/dispatch-appointment-notifications/index.ts`
  - Push schema migration:
    - `supabase/migrations/20260507142000_push_notifications.sql`

### Changed
- Calendar day cells now show first names only, while popup details show full names and appointment time.
- Removed raw date input from scheduler form; selected date now comes from calendar/popup flow and is shown as read-only text.
- Removed calendar helper text mentioning "day cells show name only".
- Wired push registration hook into dentist dashboard (`src/components/DentistDashboardFull.tsx`).
- Updated PWA config to import push handler script in generated service worker (`vite.config.ts`).
- Updated `README.md` with push notification environment/secrets setup notes.

## 2026-05-07 - Supabase CLI Link Fix

### Fixed
- Updated `supabase/config.toml` to match current Supabase CLI schema so `npx supabase link --project-ref zjfhrcndlhyvyijgrsbf` works.
- Adjusted `realtime.ip_version` format and removed deprecated keys under `realtime`, `storage`, `auth`, `auth.email`, and `auth.sms`.
- Confirmed linking works successfully via CLI.

### Changed
- Updated linked local database version in `supabase/config.toml`:
  - `[db].major_version = 17`

## 2026-05-07 - Migration Compatibility Fix

### Fixed
- Patched `supabase/migrations/20250804150859_2394a3e4-3340-4be5-9a94-9e415deede25.sql` to remove dependency on non-existent `dentists.user_id`.
- Made dentist policy creation idempotent with `DROP POLICY IF EXISTS` before `CREATE POLICY`.
- Made storage/X-ray migrations idempotent:
  - `supabase/migrations/20250806122209_c7825d2c-5899-47da-88a4-ee6967319e99.sql`
  - `supabase/migrations/20250806122745_6ce8c9b7-e22a-4ca4-ba08-b4e56cae401c.sql`
  - Added `ON CONFLICT DO NOTHING`, `DROP POLICY IF EXISTS`, and `ADD COLUMN IF NOT EXISTS`.

### Why
- `npx supabase db push` failed with:
  - `ERROR: column "user_id" does not exist (SQLSTATE 42703)`
- The app uses local auth for dentists, so policy checks against `auth.uid() = user_id` are not applicable in this schema.

## 2026-05-07 - Supabase Secret Naming + VAPID Guidance

### Fixed
- Updated edge functions to read `SERVICE_ROLE_KEY` (with fallback to `SUPABASE_SERVICE_ROLE_KEY`) because Supabase CLI blocks custom secrets prefixed with `SUPABASE_`.
  - `supabase/functions/register-push-subscription/index.ts`
  - `supabase/functions/dispatch-appointment-notifications/index.ts`

### Documentation
- Updated `README.md` push setup section:
  - Use `SERVICE_ROLE_KEY` for function secret.
  - Added VAPID key generation command: `npx web-push generate-vapid-keys`.

## 2026-05-08 - Appointment Tab Consolidation + Date Popup Management

### Changed
- Removed `Schedule` tab from `src/components/DentistDashboardFull.tsx`.
- Moved appointment scheduling/calendar workflow fully under the `Appointments` tab.
- Updated tab grid layout after removing `Schedule`.

### Updated Scheduler UX (`src/components/AppointmentScheduler.tsx`)
- Removed the extra selected-date field under the calendar form section.
- Calendar date selection remains through popup flow (`Schedule Patient on This Date`).
- Added per-appointment management actions directly in date popup:
  - Approve
  - Reschedule
  - Mark Complete
  - Delete
- Reused existing completion/reschedule modals inside scheduler popup context.
- Moved the scheduling form into its own popup dialog (`isScheduleDialogOpen`) triggered only from date popup action.
- Removed always-visible inline scheduling form below the calendar.
- Improved popup usability and responsiveness:
  - Added viewport-constrained dialog sizes.
  - Enabled internal vertical scrolling for long content (`max-h` + `overflow-y-auto`).
  - Adjusted widths for desktop/mobile (`w-[95vw]` / `sm:max-w-*`) to prevent clipped fields.

## 2026-05-08 - Appointment Time Shift + Mobile Responsiveness

### Fixed
- Resolved appointment time display shift after status updates/approval by stopping timezone-based rendering for appointment display fields.
  - Updated:
    - `src/components/AppointmentScheduler.tsx`
    - `src/components/DentistDashboard.tsx`
    - `src/components/AppointmentRescheduleModal.tsx`
- Appointment time is now rendered from stored `HH:mm` portion directly to preserve clinic-entered local time.

### UI / Responsiveness
- Improved mobile responsiveness in `src/components/DentistDashboardFull.tsx`:
  - Header now stacks properly on small screens.
  - Action buttons wrap instead of overflowing.
  - Tabs changed to horizontally scrollable strip on mobile to prevent cramped/ugly grid layout.
- Further tuned mobile calendar density in `src/components/AppointmentScheduler.tsx`:
  - Reduced paddings/gaps and font sizes on small screens.
  - Smaller day-cell minimum height on phones.
  - Show only first patient name on mobile day cell (additional names shown on larger screens).
  - Cleaner compact `+N` indicator on crowded days.

### Verification
- `npm run build` passes after these changes.

## 2026-05-08 - Mobile Fingerprint Unlock

### Added
- Mobile-only biometric unlock support in `src/pages/Auth.tsx`.
- Uses WebAuthn platform authenticator (fingerprint/biometric via device support).
- Shows `Unlock with Fingerprint` button only when:
  - device is detected as mobile
  - WebAuthn is available
  - biometric credential has already been registered on this device

### Behavior
- After a successful password login on mobile, user is prompted once to enable fingerprint unlock.
- If enabled, credential + local login pair is stored for quick biometric sign-in on that device.
- Desktop users continue using regular username/password flow (no biometric button shown).

## 2026-05-08 - X-ray Inbox Import + Patient Folder Routing

### Added
- Scanner inbox location setting in X-ray uploader (`XrayImageUpload`), stored locally as:
  - `toothtime.xray.inbox.path`
- New `Import from Scanner Folder` action for bulk importing image files and auto-assigning them to the current patient.

### Changed
- Supabase X-ray uploads are now routed into patient/date folder paths:
  - `xrays/<patientId>/<YYYY-MM-DD>/<generated-file>`
- X-ray remove logic now supports nested storage paths (not just flat filenames).
- If Supabase is unavailable/offline, X-rays are stored locally as data URLs so the workflow still works.

### Wiring Updates
- Passed `patientId` into X-ray uploader from:
  - `src/components/PatientXrayManager.tsx`
  - `src/components/AppointmentCompletionModalWithXrays.tsx`
  - `src/components/VisitTracker.tsx`

## 2026-05-08 - Tauri PC Watch Folder Automation

### Added (Rust / Tauri backend)
- New Tauri commands in `src-tauri/src/lib.rs`:
  - `set_xray_watch_directory`
  - `get_xray_watch_directory`
  - `scan_xray_inbox_for_patient`
- Persistent watch-folder config stored in app config directory (`xray-watcher.json`).
- Scan command now:
  - reads image files from watched inbox folder
  - returns image data for upload
  - moves processed files into `_processed/<patientId>/...`

### Added (Frontend)
- New helper `src/lib/tauriXray.ts` for Tauri command invocation.
- `XrayImageUpload` now supports Tauri-only watch workflow:
  - save watched folder path
  - manual scan now (`Scan Watched Folder Now`)
  - auto-import toggle (`Auto-import: ON/OFF`) polling every 5 seconds
  - automatic import and patient-assigned upload to Supabase path

### Dependency Updates
- Added Rust dependency in `src-tauri/Cargo.toml`:
  - `base64 = "0.22"`

### Validation
- `npm run build` succeeded.
- `cargo check` succeeded for `src-tauri`.

## 2026-05-08 - Admin Patient Deletion + Fingerprint Visibility Diagnostics

### Added
- Admin-only `Delete Patient` action in `src/components/PatientList.tsx`.
- Added patient deletion logic in `src/services/dataService.ts` with related local record cleanup:
  - appointments
  - medical history
  - visits
  - payments

### Fingerprint Login Improvements
- Added biometric support status messaging in `src/pages/Auth.tsx` so users can see why fingerprint option is not shown.
- Added capability checks and user-facing reasons for unsupported environments (e.g., non-secure context / unsupported webview).
- Added `Remove Fingerprint Setup` action to reset local biometric credential state on device.

## 2026-05-08 - Edit Dentists Mobile Scroll Fix

### Fixed
- Updated `src/components/AdminDentistManager.tsx` so dentist management and edit modal are scrollable/responsive on smaller screens:
  - Added max-height + vertical scrolling to current dentists list container.
  - Updated edit dialog to viewport-constrained width/height and internal scroll (`max-h` + `overflow-y-auto`).

## 2026-05-08 - Safer Admin Patient Deletion

### Changed
- Replaced simple browser confirm with typed deletion confirmation in `src/components/PatientList.tsx`.
- Admin must now type `DELETE` before patient deletion is enabled/allowed.
- Added dedicated confirmation dialog with clear warning about related-record deletion.

## 2026-05-08 - Session Persistence + Dentist Patient Deletion Access

### Fixed
- Reduced "No active session. Please log in again" interruptions in patient records unlock flow:
  - `src/contexts/AuthContext.tsx` now stores login password backup in `localStorage` for recovery across tab/session resets.
  - `src/components/PatientRecordsAuth.tsx` now checks session password first, then fallback backup password.
  - Updated error wording to "Session expired. Please log in again."

### Changed
- Enabled typed `DELETE` patient removal action for dentist role (in addition to admin) in `src/components/PatientList.tsx`.

## 2026-05-08 - Custom Appointment Delete Confirmation Dialog

### Changed
- Replaced native browser/Tauri `window.confirm` delete prompts with in-app styled dialogs for appointment deletion.
- Updated components:
  - `src/components/AppointmentScheduler.tsx`
  - `src/components/DentistDashboard.tsx`

### Result
- Confirmation popouts now match app UI (no more "tauri.localhost says" browser-native prompt).

## Version 2.0.0 - Major Refactoring (January 19, 2026)

### 🎯 Overview
Complete refactoring with offline-first architecture, improved code quality, and removed third-party dependencies.

### ✨ New Features

#### Offline Functionality
- **Full offline support** - Application works completely offline
- **Automatic sync** - Data syncs automatically when internet connection is restored
- **Local data storage** - IndexedDB (Dexie.js) for persistent local storage
- **Sync queue** - Changes made offline are queued and synced with retry logic
- **Network status indicator** - Visual badge showing online/offline status
- **Pending sync counter** - Shows number of changes waiting to sync

#### Architecture Improvements
- **Unified data layer** - New `dataService` provides consistent API for all data operations
- **Type safety** - Comprehensive TypeScript interfaces for all data models
- **Service layer pattern** - Clear separation between data access, sync, and UI

### 🔧 Technical Changes

#### New Files
- `src/types/index.ts` - Complete TypeScript type definitions
- `src/services/db.ts` - IndexedDB database wrapper
- `src/services/dataService.ts` - Unified data access layer with offline support
- `src/services/syncService.ts` - Bidirectional sync service
- `src/hooks/useNetworkStatus.ts` - Network detection hook
- `src/components/NetworkStatus.tsx` - Network status UI component

#### Refactored Components
- `DentistDashboard.tsx` - Now uses dataService, improved types
- `AppointmentScheduler.tsx` - Refactored for offline support
- `AuthContext.tsx` - Cleaned up, removed console logs
- `DentistDashboardFull.tsx` - Added network status indicator
- `PatientForm.tsx` - Cleaned up error handling

#### Dependencies
- ✅ Added: `dexie` (IndexedDB wrapper)
- ✅ Added: `uuid` (UUID generation)
- ❌ Removed: `lovable-tagger`

### 🧹 Code Quality Improvements

#### Removed Console Logs
All `console.log` statements removed from:
- AuthContext
- Index page
- DentistDashboard
- AppointmentScheduler
- PatientForm

#### Improved Error Handling
- User-friendly error messages
- Silent error handling where appropriate
- Proper error boundaries
- Offline fallback mechanisms

#### Type Safety
- Replaced `any` types with proper interfaces
- Added comprehensive type definitions
- Improved type inference throughout codebase

### 📚 Documentation
- Completely rewritten README.md
- Removed Lovable references
- Added comprehensive project documentation
- Documented offline functionality

### 🔒 Conflict Resolution
- Implements last-write-wins strategy
- Retry logic with max 3 attempts
- Failed syncs remain in queue for retry

### 🚀 Build Status
✅ Project builds successfully with no TypeScript errors

### 📦 Installation

```bash
cd Dental-Clinic-Management-System-V2
npm install
npm run dev
```

### 🎓 How Offline Mode Works

1. **Online Mode**
   - Fetches data from Supabase
   - Caches locally in IndexedDB
   - Immediately syncs changes to server

2. **Offline Mode**
   - All operations work with local cache
   - Changes queued in sync queue
   - UI shows offline badge

3. **Reconnection**
   - Auto-detects connection restoration
   - Syncs all pending changes
   - Pulls latest data from server
   - Shows success notification

---

**Previous Version**: 1.0.0
**Current Version**: 2.0.0
**Migration**: All functionality preserved, enhanced with offline support
