# RestMan

**RestMan** is a modern, open-source REST & WebSocket API client — a self-hosted alternative to Postman with a focus on speed, keyboard-first workflow, and developer quality-of-life.

<!-- ![RestMan Screenshot](./docs/screenshot.png) -->

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Usage Guide](#usage-guide)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Collections & Folders](#collections--folders)
- [Environments & Variables](#environments--variables)
- [WebSocket Support](#websocket-support)
- [History](#history)
- [Settings & Themes](#settings--themes)
- [Why RestMan over Postman?](#why-restman-over-postman)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core

- **HTTP Requests** — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS with full header, param, body, and auth support
- **WebSocket** — real-time bi-directional connections with message log
- **Collections** — organize requests into collections and nested folders with color coding
- **Environments** — variable interpolation using `{{variableName}}` syntax across URLs, headers, and bodies
- **Request History** — automatic logging of every request sent, filterable and re-openable
- **Themes** — built-in dark/light themes, full custom theme editor

### Standout Features (vs Postman)

| Feature                          | RestMan | Postman             |
| -------------------------------- | ------- | ------------------- |
| Self-hosted / offline-first      | ✅      | ❌ (cloud-required) |
| Command Palette (Cmd+K)          | ✅      | ❌                  |
| cURL Import & Export             | ✅      | ✅                  |
| Response time sparkline          | ✅      | ❌                  |
| Tab persistence across reloads   | ✅      | Partial             |
| Drag-and-drop collection reorder | ✅      | ✅                  |
| Free forever, no account needed  | ✅      | ❌                  |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)
- **MongoDB** (optional) or SQLite (default, zero config)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourname/restman.git
cd restman

# Install backend dependencies
cd backend && pnpm install

# Install frontend dependencies
cd ../frontend && pnpm install
```

### Running in Development

```bash
# Terminal 1 — backend (default: SQLite, port 3001)
cd backend && pnpm dev

# Terminal 2 — frontend (Vite dev server, port 5173)
cd frontend && pnpm dev
```

Open **http://localhost:5173** in your browser.

### Running with MongoDB

Set the environment variable before starting the backend:

```bash
DB_ENGINE=mongodb MONGO_URI=mongodb://localhost:27017/restman pnpm dev
```

### Production Build

```bash
cd frontend && pnpm build
cd ../backend && pnpm start
# App is now served at http://localhost:3001
```

---

## Architecture

```
restman/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express + WebSocket proxy server
│   │   ├── db/
│   │   │   ├── config.js      # DB engine selector (sqlite | mongodb)
│   │   │   ├── sqliteAdapter.js
│   │   │   └── mongoAdapter.js
│   │   └── routes/
│   │       ├── collections.js
│   │       ├── environments.js
│   │       ├── history.js
│   │       └── settings.js
│   └── package.json
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/        # AppShell, Titlebar, Sidebar, MainArea
        │   ├── request/       # RequestPanel, URLInput, MethodSelector, tabs
        │   ├── response/      # ResponsePanel, ResponseTimingBar
        │   ├── collections/   # CollectionPanel, SaveRequestModal
        │   ├── environment/   # EnvironmentPanel, EnvSelector
        │   ├── history/       # HistoryPanel
        │   ├── websocket/     # WSPanel
        │   └── ui/            # Portal, CommandPalette, CurlImportModal
        ├── store/             # Zustand stores (tabs, collections, env, history, ui)
        ├── utils/             # api.js, helpers.js
        └── themes/            # Theme definitions and applicator
```

**Frontend**: React 18 + Vite + Zustand + TailwindCSS + Monaco Editor  
**Backend**: Express.js + better-sqlite3 / Mongoose  
**Proxy**: All HTTP requests are proxied through the backend to avoid CORS issues

---

## Usage Guide

### Making a Request

1. Click **+** in the tab bar (or press `Ctrl+T`) to open a new request tab
2. Select the HTTP method from the dropdown
3. Enter the URL — use `{{variableName}}` for environment variables
4. Configure **Params**, **Headers**, **Body**, and **Auth** in the tabs below
5. Press **Send** or hit `Enter` in the URL bar

### Auth Types

| Type         | Description                                         |
| ------------ | --------------------------------------------------- |
| None         | No authentication                                   |
| Bearer Token | Adds `Authorization: Bearer <token>` header         |
| Basic Auth   | Base64 encodes `username:password`                  |
| API Key      | Adds a custom key header (configurable header name) |

### Request Body Types

- **None** — no body
- **JSON** — raw JSON with syntax highlighting
- **Raw** — plain text
- **Form Data** — multipart/form-data (supports file uploads)
- **URL Encoded** — application/x-www-form-urlencoded

### Saving a Request

- Press `Ctrl+S` or click the **Save** button
- If the request is **new** (never saved): a modal prompts you to choose a collection and optional folder, and name the request
- If the request is **already saved**: it updates in-place immediately — no modal
- Unsaved tabs appear in _italic_ in the tab bar; modified saved requests show an orange dot `●`

---

## Keyboard Shortcuts

| Shortcut                      | Action               |
| ----------------------------- | -------------------- |
| `Ctrl+K` / `Cmd+K`            | Open Command Palette |
| `Ctrl+B` / `Cmd+B`            | Toggle sidebar       |
| `Ctrl+S` / `Cmd+S`            | Save current request |
| `Enter` (in URL bar)          | Send request         |
| `Ctrl+Enter` (in cURL import) | Import cURL          |
| Middle-click tab              | Close tab            |
| Double-click tab name         | Rename tab inline    |

---

## Collections & Folders

### Creating a Collection

Click the **+** icon in the Collections panel header. Give it a name and pick a color.

### Adding Requests / Folders

Right-click any collection or folder to access the context menu:

- Add HTTP Request
- Add WebSocket
- Add Folder / Subfolder
- Rename, Change Color, Duplicate, Delete

### Drag and Drop

Items in the collection tree support full drag-and-drop:

- Drag a **request** from one folder/collection and drop it onto another folder or collection
- Drag a **folder** and drop it onto a different collection to move it
- A dashed drop zone appears at the bottom of each folder for easy dropping

### Opening a Saved Request

Click any request in the collection tree. If it's already open in a tab, that tab is focused. Otherwise a new tab opens with the saved request data pre-loaded and `isDirty = false`.

---

## Environments & Variables

### Creating an Environment

Go to the **Environments** tab in the sidebar → click **+** → name the environment and add key-value pairs.

### Using Variables

Use `{{variableName}}` anywhere in URLs, header values, or body text:

```
https://{{baseUrl}}/api/{{version}}/users
Authorization: Bearer {{token}}
```

### Global Variables

Variables defined in the special **Global** environment are available in all environments simultaneously.

### Active Environment

Select the active environment from the dropdown in the top-right corner of the app. Only one environment can be active at a time (globals always apply).

---

## WebSocket Support

1. Click **+** → **WebSocket** (or `Ctrl+Shift+W`)
2. Enter the WebSocket URL (e.g. `ws://localhost:8080/chat`)
3. Click **Connect**
4. Type a message in the bottom input and press **Send** or `Enter`
5. All sent and received messages appear in the log with timestamps
6. Click **Disconnect** to close the connection

WebSocket sessions can be saved to collections just like HTTP requests.

---

## Command Palette

Press **Ctrl+K** (or **Cmd+K** on Mac) to open the Command Palette from anywhere in the app.

You can:

- **Search** all saved requests across all collections
- **Open** a request directly into a new tab
- **Run** quick actions (New HTTP Request, New WebSocket, Toggle Sidebar)
- **Reopen** recent history entries
- Navigate with `↑`/`↓` arrows, confirm with `Enter`, dismiss with `Escape`

---

## cURL Import & Export

### Import

Click **+** → **Import cURL** (or use the Command Palette). Paste any `curl` command:

```bash
curl -X POST https://api.example.com/users \
  -H "Authorization: Bearer mytoken" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

RestMan parses the method, URL, headers, and body automatically and opens it as a new tab.

### Export

Click the **cURL** button in the URL bar of any request tab to copy the equivalent `curl` command to your clipboard.

---

## Response Timing Sparkline

After sending a request multiple times, a **timing bar** appears at the bottom of the response panel showing the last 20 response times as a sparkline. This helps you:

- Spot performance regressions at a glance
- See trend arrows (↑ slower, ↓ faster) with percentage delta
- Identify outliers without leaving the app

Timing data is stored per-tab in memory and persists across reloads.

---

## History

All requests are automatically logged in the **History** tab (last 200 entries). Each entry shows:

- Method, URL, status code
- Response time and size
- Timestamp

Click any entry to re-open it as a new tab. Use the **Clear** button to wipe the history.

---

## Settings & Themes

Access **Settings** via the gear icon (top-right).

### Available Settings

- **Theme** — choose from built-in dark/light themes or create a custom theme
- **Database** — view which DB engine is active (SQLite / MongoDB)
- **Proxy** — the backend proxy URL (default: `/api/proxy`)

### Custom Themes

Go to Settings → Themes → **New Theme**. Customize colors using the visual editor. Custom themes are stored in `localStorage` and persist across reloads.

---

## Tab Persistence

All open tabs — including **unsaved** ones — are automatically saved to `localStorage`. When you reload the page:

- All tabs are restored exactly as they were
- URL, method, headers, body, auth, and unsaved state are all preserved
- Active tab is restored
- Response data is cleared (requests are not re-sent automatically)

This mirrors the VSCode / Postman behavior where your workspace survives a browser refresh.

---

## Why RestMan over Postman?

|                        | RestMan                          | Postman                                  |
| ---------------------- | -------------------------------- | ---------------------------------------- |
| **Self-hosted**        | ✅ Runs entirely on your machine | ❌ Requires Postman account + cloud sync |
| **Offline**            | ✅ 100% offline capable          | ❌ Many features need internet           |
| **Open source**        | ✅ MIT license                   | ❌ Closed source                         |
| **Command Palette**    | ✅ Ctrl+K fuzzy search           | ❌ Not available                         |
| **Tab persistence**    | ✅ Survives page reload          | Partial (requires login)                 |
| **Response sparkline** | ✅ Built-in timing history       | ❌ Requires Newman/scripting             |
| **cURL roundtrip**     | ✅ Import + Export               | ✅ Import only in free tier              |
| **Privacy**            | ✅ No telemetry, no account      | ❌ Usage data collected                  |
| **Cost**               | ✅ Free forever                  | ❌ Paid plans for teams                  |

---

## API Reference (Backend)

The backend exposes a REST API for the frontend and can be used independently.

### Collections

| Method | Endpoint                             | Description                            |
| ------ | ------------------------------------ | -------------------------------------- |
| GET    | `/api/collections`                   | List all collections                   |
| POST   | `/api/collections`                   | Create a collection                    |
| PUT    | `/api/collections/:id`               | Update collection metadata             |
| DELETE | `/api/collections/:id`               | Delete a collection                    |
| POST   | `/api/collections/:id/requests`      | Add a request                          |
| PUT    | `/api/collections/:id/requests/:rid` | Update a request                       |
| DELETE | `/api/collections/:id/requests/:rid` | Delete a request                       |
| POST   | `/api/collections/:id/folders`       | Add a folder                           |
| PUT    | `/api/collections/:id/folders/:fid`  | Update a folder                        |
| DELETE | `/api/collections/:id/folders/:fid`  | Delete a folder                        |
| PUT    | `/api/collections/:id/tree`          | Replace entire tree (for bulk reorder) |

### Environments

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| GET    | `/api/environments`     | List all environments |
| POST   | `/api/environments`     | Create an environment |
| PUT    | `/api/environments/:id` | Update an environment |
| DELETE | `/api/environments/:id` | Delete an environment |

### History

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| GET    | `/api/history`     | Get last 200 entries |
| POST   | `/api/history`     | Add an entry         |
| DELETE | `/api/history`     | Clear all history    |
| DELETE | `/api/history/:id` | Delete one entry     |

### Proxy

| Method | Endpoint     | Description                              |
| ------ | ------------ | ---------------------------------------- |
| POST   | `/api/proxy` | Forward an HTTP request (multipart form) |

---

## Contributing

Pull requests are welcome! Please:

1. Fork the repo and create a feature branch
2. Follow the existing code style (ESLint + Prettier config in repo)
3. Use TailwindCSS for all new UI — avoid plain CSS unless unavoidable
4. Use `lucide-react` for icons — no SVGs inline
5. Open a PR with a clear description of what you changed and why

### Running Tests

```bash
cd backend && pnpm test
```

---
