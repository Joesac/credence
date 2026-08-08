# Credence

**Version:** 2.0.0  
**Author:** Effervetech Company Ltd

Credence is a desktop financial management application built with Angular and Electron. It is designed for transparent tracking of members, deposits, withdrawals, loans, repayments, fund distributions, and user administration using a local SQLite database.

## Features

- **Member Management** — Register, update, and browse members with phone validation and financial summaries.
- **Deposits & Withdrawals** — Record, edit, delete, and paginate daily transactions.
- **Loans & Repayments** — Issue loans, track repayments, and view member loan histories.
- **Fund Distributions** — Allocate funds and view distribution analytics.
- **Daily Reports** — View summary cards and paginated deposits/withdrawals for any date.
- **User Management** — Add users, manage roles and statuses, verify passwords, and handle idle session warnings.
- **Theming** — Dark/light mode support with Tailwind CSS and Angular Material.
- **Splash Screen** — Native, frameless splash window with the brand logo and a loading indicator shown while Angular loads.
- **Collapsible Sidebar** — Left navigation can be collapsed and reopened from the topbar.
- **Responsive UI** — Built with Tailwind CSS and Angular Material components.

## Tech Stack

- **Frontend:** Angular 22, Angular Material 22, Tailwind CSS 4, RxJS, signals-based forms
- **Desktop:** Electron 43, Electron Forge 7
- **Database:** SQLite via `better-sqlite3`
- **Build:** Angular CLI, TypeScript, Electron Forge makers (Squirrel, WiX, ZIP, DEB, RPM)
- **Testing:** Vitest

## Project Structure

```
credence/
├── electron/                 # Main process (Node/Electron)
│   ├── main.ts               # Main process entry, window creation, splash screen, DB init
│   ├── preload.ts            # Secure context bridge for IPC
│   ├── ipc.ts                # IPC handler registration utility
│   ├── constants.ts          # IPC channels and SQL schema constants
│   ├── database/             # DB schemas and migrations
│   ├── functions/            # Data access functions (users, members, transactions, loans, etc.)
│   └── assets/icons/         # Application icons
├── src/app/                  # Angular renderer process
│   ├── core/services/        # App-wide services (AppService, IPC bridge, idle, right sidebar)
│   ├── pages/                # Route pages (auth, portal, members, transactions, loans, reports, settings)
│   ├── shared/components/    # Reusable UI (topbar, data table, inputfield, etc.)
│   └── ...
├── public/                   # Static assets (logo, splash.html)
├── dist/                     # Angular build output
└── dist-electron/            # Compiled Electron output
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 24.15.0 (recommended via [Volta](https://volta.sh/))
- npm 11.12.1

### Install

```bash
npm install
```

### Run in development

Start the Angular dev server:

```bash
ng serve
```

Then, in another terminal, start the Electron process:

```bash
npm start
```

Or compile and start Electron directly:

```bash
npm run compile-electron
npm run serve-electron
```

## Build & Package

### Build the Angular app

```bash
npm run build
```

Output: `dist/credence/browser/`

### Compile the Electron main process

```bash
npm run compile-electron
```

Output: `dist-electron/`

### Package the app (unpackaged build)

```bash
npm run package
```

Output: `out/`

### Create installers

```bash
npm run make
```

The Windows installer (Squirrel) is created at:

```
out/make/squirrel.windows/x64/
```

Look for `Setup.exe`.

## Database

Credence uses a local SQLite database. The file is:

- **Development:** `<project-root>/database.db` (configurable via `DEVELOPMENT_DATABASE_FILENAME`)
- **Production:** `<userData>/database.db` (configurable via `PRODUCTION_DATABASE_FILENAME`)

On first launch, the app creates the schema and seeds a default admin user.

## IPC / Preload

All main-process APIs are exposed to the renderer via a typed `window.electronAPI` bridge (`src/decl.d.ts`). The Angular app uses `IpcBridgeService` and related services to call IPC channels.

## Application Window

- The app opens maximized with a minimum size of 1024x700.
- A native splash screen (`public/splash.html`) is displayed while Angular loads, then the main window is revealed.
- The left sidebar is collapsible and can be reopened from the topbar.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Compile Electron and start the desktop app |
| `npm run build` | Build the Angular app for production |
| `npm run package` | Package the app for the current platform |
| `npm run make` | Build Angular, compile Electron, and create installers |
| `npm run compile-electron` | Compile the Electron TypeScript |
| `npm run compile-electron:watch` | Compile Electron in watch mode |
| `npm run serve-electron` | Run the compiled Electron main process |
| `npm run dev:electron` | Watch Electron source and restart on changes |
| `npm test` | Run unit tests |
| `ng e2e` | Run end-to-end tests (requires a test framework) |

## License

© 2026 Effervetech Company Ltd. All rights reserved.
