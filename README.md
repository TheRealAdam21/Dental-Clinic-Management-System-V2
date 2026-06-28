# Tooth Time - Dental Clinic Management System

A comprehensive dental clinic management application built with modern web technologies and Electron/Tauri for cross-platform desktop deployment.

## Features

- **Patient Management**: Register and manage patient information with detailed medical history
- **Appointment Scheduling**: Schedule, approve, complete, and reschedule appointments
- **Offline Support**: Full offline functionality with automatic sync when online
- **X-ray Management**: Upload and manage patient x-ray images
- **Payment Tracking**: Track patient payments and visit history
- **Secure Access**: Password-protected patient records with authentication

## Technologies

This project is built with:

- **Frontend**: React 18, TypeScript
- **UI Components**: Radix UI, shadcn-ui
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **State Management**: TanStack Query (React Query)
- **Offline Storage**: IndexedDB with Dexie.js
- **Desktop**: Tauri (cross-platform desktop app)

## Getting Started

### Prerequisites

- Node.js 16+ and npm (or bun)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop builds)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd tooth-time-electron

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_VAPID_PUBLIC_KEY=your_web_push_vapid_public_key
```

For scheduled push notifications, also set these in Supabase Edge Function secrets:

```env
VAPID_PUBLIC_KEY=your_web_push_vapid_public_key
VAPID_PRIVATE_KEY=your_web_push_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
SERVICE_ROLE_KEY=your_service_role_key
```

Generate VAPID keys locally with:

```bash
npx web-push generate-vapid-keys
```

## Development

```sh
# Run web app in development mode
npm run dev

# Build for production
npm run build

# Run Tauri desktop app
npm run tauri dev

# Build desktop app
npm run tauri build

# Run linter
npm run lint
```

## Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   └── ...           # Feature-specific components
├── contexts/         # React contexts (Auth, etc.)
├── hooks/            # Custom React hooks
├── integrations/     # External service integrations
│   └── supabase/    # Supabase client and types
├── lib/              # Utility functions and schemas
├── pages/            # Page components
└── services/         # Business logic and services
```

## Offline Functionality

The app supports full offline functionality:

- All data is cached locally using IndexedDB
- Changes made offline are queued and synced when connection is restored
- Network status is displayed in the UI
- Conflict resolution uses last-write-wins strategy

## Scheduled Push Notifications

This project includes:

- Browser push subscription registration (`register-push-subscription` function)
- Service worker push handlers (`public/push-handler.js`)
- Scheduler/dispatcher function (`dispatch-appointment-notifications`)

Recommended setup:

1. Run Supabase migrations (includes `push_subscriptions` and dispatch logs).
2. Deploy both edge functions.
3. Create a cron job in Supabase to call `dispatch-appointment-notifications` every 5 minutes.

## License

All rights reserved.
