# mofsAI Frontend — Unified Architecture

This document describes the unified frontend architecture after merging upload/prediction functionality into the main Next.js application.

## Repository Context

The repository contained a single Next.js frontend (`frontend/mofsAI`) and a Flask backend. The frontend has been restructured to:

- **Preserve all features**: Landing (Hero, Services, Portfolio, About, Contact, CTA), prediction API, and the new Upload UI.
- **Integrate Upload**: Upload/prediction is now a first-class feature with its own page, linked from the main navigation.
- **Unify styling and components**: Shared components (Button, Card, Container) support both landing and upload use cases.

## New Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/predict/        # Prediction API route (calls run_model.py)
│   ├── upload/page.tsx     # Upload & Predict page
│   ├── page.tsx            # Home (landing)
│   ├── layout.tsx          # Root layout (Header, main, Footer)
│   └── globals.css         # Global styles
├── components/             # Reusable UI
│   ├── common/             # Button, Card, Container
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── Services.tsx
│   ├── Portfolio.tsx
│   ├── About.tsx
│   ├── Contact.tsx
│   ├── CTA.tsx
│   └── Testimonials.tsx
├── features/               # Feature-specific UI and logic
│   └── upload/
│       └── UploadPage.tsx  # Upload CSV + JSON predict form
├── services/               # API and external calls
│   └── api.ts              # postPredict()
├── hooks/                  # Shared React hooks
│   └── usePredict.ts       # predict(), result, loading, error
├── utils/                  # Pure helpers
│   ├── csv.ts              # parseCsvToObject()
│   └── index.ts
├── styles/                 # Extra styles (tokens, etc.)
│   └── tokens.css
└── types/
    └── index.ts            # Shared TypeScript types
```

## Roles

- **components**: Reusable, presentational UI used across the app (buttons, cards, layout, sections).
- **features**: Screens or flows that combine components, hooks, and services (e.g. upload + predict).
- **services**: HTTP and other external calls (e.g. `/api/predict`).
- **hooks**: Shared stateful logic (e.g. `usePredict` for calling the API and holding result/loading/error).
- **utils**: Stateless helpers (e.g. CSV parsing).
- **styles**: Design tokens and extra CSS; `app/globals.css` remains the main global entry.

## Features Preserved

| Feature | Location | Notes |
|--------|-----------|--------|
| Landing | `app/page.tsx` + sections in `components/` | Hero, Services, Portfolio, About, Contact, CTA |
| Navigation | `Header.tsx`, `Footer.tsx` | Home, Upload, Services, Projects, About, Contact |
| Upload & Predict | `app/upload/page.tsx`, `features/upload/UploadPage.tsx` | CSV upload + JSON form → predict API |
| Prediction API | `app/api/predict/route.ts` | POST JSON → `run_model.py` → JSON result |

## Files Merged / Added

- **Added**: `src/services/api.ts` — `postPredict()` for the predict API.
- **Added**: `src/hooks/usePredict.ts` — hook for predict flow.
- **Added**: `src/utils/csv.ts` and `src/utils/index.ts` — CSV parsing for uploads.
- **Added**: `src/features/upload/UploadPage.tsx` — Upload page UI (file input + JSON form).
- **Added**: `src/app/upload/page.tsx` — Route that renders `UploadPage`.
- **Added**: `src/styles/tokens.css` — Placeholder for design tokens.
- **Updated**: `Header.tsx` / `Footer.tsx` — Links for Home and Upload; Next.js `Link` where appropriate.
- **Updated**: `Button.tsx` — Supports `href` (render as `<a>`), `label`, and `className`.
- **Updated**: `Card.tsx` — Supports optional `children`, optional `image`/`icon`, and `className`.
- **Updated**: `app/page.tsx` — Removed duplicate Header/Footer (in layout); added CTA linking to Upload.
- **Updated**: `CTA.tsx` — Copy and primary action point to `/upload`.
- **Updated**: `app/api/predict/route.ts` — Explicit `Promise<NextResponse>` return type for TypeScript.
- **Updated**: `tailwind.config.ts` — Converted to ES module (`export default`) for `isolatedModules`.

## Improvements

1. **Single app**: One Next.js app with landing and upload/predict; no duplicate frontends.
2. **Clear separation**: Components vs features vs services vs hooks vs utils.
3. **Upload integration**: Upload is a top-level nav item and a dedicated route; CTA directs users to it.
4. **Reusable components**: One Button (with link variant) and one Card (with children or props) for both landing and upload.
5. **Type safety**: Predict API and route typed; shared types in `src/types`.
6. **Consistent styling**: Tailwind and `globals.css` used across home and upload; upload page uses same Container and Button.

## Running the App

From the frontend directory:

```bash
npm install
npm run dev
```

- Home: `http://localhost:3000/`
- Upload & Predict: `http://localhost:3000/upload`

The predict API expects `run_model.py` (and `material_model.pkl`, `features.pkl`) to be available from the project root when the API route runs (e.g. when using a backend that invokes the script from repo root).
