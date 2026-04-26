# Snap — Architecture & Conventions

This is a personal macOS menubar screenshot app. Structure and conventions follow the [Gitify](https://github.com/gitify-app/gitify) reference architecture.

## Project Structure

```
src/
├── main/                         # Electron main process
│   ├── index.ts                  # Slim entry: stream guards, app.whenReady, lifecycle events
│   ├── config.ts                 # Tray icon creation, window defaults
│   ├── utils.ts                  # File ops, icns path lookup, duplicate helpers
│   ├── database.ts               # SQLite setup and CRUD (better-sqlite3)
│   ├── capture.ts                # Screen capture (screencapture CLI)
│   ├── snap-window.ts            # Floating snap window lifecycle
│   ├── menu-window.ts            # Context menu popup window lifecycle
│   ├── browser-window.ts         # Library browser window lifecycle
│   ├── handlers/                 # IPC handlers grouped by DOMAIN (not by Electron API)
│   │   ├── index.ts              # registerAllHandlers() — entry point
│   │   ├── app.ts                # APP_VERSION, APP_QUIT, WINDOW_HIDE
│   │   ├── snap.ts               # Snap window operations (move, opacity, copy, etc.)
│   │   ├── annotations.ts        # Save/load annotations, thumbnail regeneration
│   │   ├── library.ts            # Snaps, tags, rename, duplicate, app icons
│   │   └── menu.ts               # Context menu popup open/dismiss/action
│   └── lifecycle/                # App lifecycle phases
│       ├── index.ts              # Re-exports
│       └── tray.ts               # createMenubar(), tray hide logic, shortcuts
│
├── preload/
│   └── index.ts                  # contextBridge API exposed as window.snap
│
├── shared/                       # Types & constants used by both main and renderer
│   ├── constants.ts              # APP_NAME, WINDOW_CONFIG, CAPTURE_SHORTCUT, etc.
│   ├── events.ts                 # IPC event name constants
│   ├── annotation-types.ts       # Annotation type discriminated union
│   └── tag-colors.ts             # Tag color utilities
│
└── renderer/                     # React UI
    ├── App.tsx                   # Menubar tray root component
    ├── App.test.tsx              # Co-located test
    ├── index.tsx, index.html     # Tray entry point
    ├── index.css                 # Tailwind + global styles
    ├── types.ts                  # SnapItem and other cross-domain types
    ├── global.d.ts               # window.snap type declarations
    │
    ├── tray/                     # THIN entry point — index.html + index.tsx only
    ├── library/                  # THIN entry point for library window
    ├── snap/                     # THIN entry point for floating snap window
    ├── menu/                     # THIN entry point for context menu popup
    │
    ├── components/               # All React components, organized by feature domain
    │   ├── icons/                # All SVG icon components (PointerIcon, TrashIcon, etc.)
    │   ├── tray/                 # SnapGrid, SnapGridItem (menubar tray UI)
    │   ├── library/              # LibraryApp, LibraryGrid, FilterPanel, TagItem, etc.
    │   ├── snap-viewer/          # SnapViewer, AnnotationLayer (floating snap window)
    │   └── context-menu/         # ContextMenu, MenuApp (popup context menu window)
    │
    ├── hooks/                    # Custom React hooks (useAnnotations, etc.)
    │
    └── __helpers__/              # Test infrastructure
        └── setup.ts              # Vitest setup, window.snap mocks
```

## Conventions

### Tests are co-located
- `Component.tsx` sits next to `Component.test.tsx` — NO `__tests__/` directories
- Test setup lives in `src/renderer/__helpers__/setup.ts`
- Run tests: `pnpm test`

### Components are organized by feature domain, not by "shared vs page-specific"
- Components that belong to the library UI go in `components/library/`
- Components that belong to the snap viewer go in `components/snap-viewer/`
- Reusable icon components go in `components/icons/`
- Do NOT create a generic `components/` dump — always pick a domain

### Icons are components, not inline SVGs
- All SVG icons live in `src/renderer/components/icons/index.tsx`
- Import from `'../icons'` — never inline a `<svg>` in a feature component
- Pattern: each icon is a named export returning a JSX `<svg>` element

### Each window has a thin entry point directory
- `src/renderer/{tray,library,snap,menu}/` contain only `index.html` and `index.tsx`
- The entry `index.tsx` imports its root React component from `components/{domain}/`
- Vite config (`vite.config.ts`) declares each as a `rollupOptions.input` entry

### IPC handlers are grouped by domain
- `src/main/handlers/{app,snap,annotations,library,menu}.ts`
- Each file exports a `register*Handlers(mb, notifyTrayUpdated?)` function
- `handlers/index.ts` calls them all from `registerAllHandlers()`
- Group by what the handlers DO (snap operations, library CRUD), not by Electron API type

### Lifecycle phases are explicit
- `src/main/lifecycle/` contains setup code split by phase
- Currently just `tray.ts` (menubar creation) — add more as needed (e.g., `first-run.ts`)

### Types
- Cross-domain types in `src/renderer/types.ts` and `src/shared/*.ts`
- Domain-specific types stay with their domain (e.g., `annotation-types.ts`)

### Hooks
- Custom React hooks in `src/renderer/hooks/`
- Naming: `use*.ts`
- Each hook encapsulates side effects so components stay declarative

### Naming
- Components use PascalCase (`LibraryGrid.tsx`)
- Hooks use camelCase with `use` prefix (`useAnnotations.ts`)
- Test files: `Component.test.tsx`
- Feature-specific directory names use kebab-case (`snap-viewer/`, `context-menu/`)

### Styling
- Tailwind CSS for all styling
- Global styles in `src/renderer/index.css`
- No CSS modules, no component-scoped CSS
- Biome config has `noSvgWithoutTitle` and `noNoninteractiveTabindex` disabled (desktop app context)

## Data model

Snaps are stored in SQLite via `better-sqlite3`:

- `snaps` table — id, name, filePath, thumbPath, sourceApp, width, height, posX, posY, opacity, hasShadow, isOpen, createdAt, annotations (JSON), thumbnailUpdatedAt
- `snap_tags` table — (snap_id, tag) composite key with cascade delete on snap

Images live at `~/Library/Application Support/Snap/snaps/` with thumbnails at `snaps/thumbs/`.

## Window lifecycle

Four window types:

1. **Menubar tray** (`menubar` package) — always-on-top popup from tray icon, 400x500, shows SnapGrid
2. **Floating snap** (one per open snap) — frameless, transparent, always-on-top, draggable, shows SnapViewer
3. **Context menu popup** (transient) — small popup for snap's context menu, shows MenuApp
4. **Library browser** (singleton) — standard macOS window, resizable, shows LibraryApp

All windows share a preload script that exposes `window.snap` with typed APIs.

## Key patterns

- **State persistence**: snap close saves posX/posY/opacity/hasShadow/isOpen to DB; reopen restores them
- **Thumbnail regeneration**: after annotation save, composite image + Konva stage is sent to main to update thumbnail
- **Tag colors**: tags get auto-assigned colors via `src/shared/tag-colors.ts` (in progress)
- **Tray refresh**: `notifyTrayUpdated()` sends `SNAPS_UPDATED` to both tray and library windows
- **Smart tray hide**: tray stays open for snap interactions, closes when focus leaves app or goes to library

## Adding a feature

1. Identify the domain — tray, library, snap-viewer, context-menu, or a new one
2. Add components to `src/renderer/components/{domain}/` with co-located tests
3. If it needs IPC, add events to `src/shared/events.ts`, preload method in `src/preload/index.ts`, handler in `src/main/handlers/{domain}.ts`
4. Custom hooks go in `src/renderer/hooks/`
5. If adding a new window, create a thin entry in `src/renderer/{name}/`, add to `vite.config.ts`, and create `src/main/{name}-window.ts`

## Reference

Gitify is the architectural reference: `~/Projects/examples/gitify`. When in doubt about where something should go, check how Gitify does it.

## Build & dev

- `pnpm dev` — start Vite + Electron
- `pnpm build` — production build
- `pnpm package:macos` — create DMG
- `pnpm test` — run vitest with coverage
- `pnpm lint:check` — Biome lint (no auto-fix)
- `pnpm lint` — Biome lint with auto-fix
- `npx tsc --noEmit` — type check

Kill stale Electron processes before restarting: `pkill -f "Electron"`
