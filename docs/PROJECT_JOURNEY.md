# ShopMart practice stack — project journey

This document summarizes how **ShopMart** was built end-to-end with AI-assisted iteration: product shape, prompts that drove major areas, CI, **SonarQube** remediation (80+ items addressed or flagged as false positives), and **Lighthouse** performance work.

---

## 1. What this project is

- **Backend** (`backend/`): Flask REST API with OpenAPI (`flask-smorest`), SQLAlchemy, JWT auth, Redis-backed logout, Postgres.
- **Frontend** (`frontend/`): React + Vite + TypeScript SPA, catalogue with filters/paging, cart, checkout, registration wizard, responsive layout with a mobile navigation drawer.
- **Infra** (`docker-compose.yml`): Postgres, Redis, optional SonarQube (Docker Hardened Image) for local static analysis UI.
- **Automation** (`.github/workflows/`): Separate pipelines for backend (lint, format, migrations, pytest, dependency audit) and frontend (lint, typecheck, unit tests, Playwright E2E).

The stack is deliberately “practice-ready”: tests, Cursor rules for Flask/React/testing/DevOps, and reproducible dependency pins (`uv.lock` + exported `requirements*.txt`).

---

## 2. How the codebase was shaped (prompt themes)

Exact chat wording varied; the bullets below capture **intent** of prompts used across sessions—useful if you rerun similar work in another repo.

### 2.1 Frontend

Typical prompts asked the assistant to:

- Scaffold **React + Vite + TypeScript** with **React Router**, environment-based API base URL, and a clear split between **`lib/api`**, **`pages/`**, **`components/`**, and **`context/`** (auth + cart).
- Implement **catalogue** UX: sort, keyword search, USD price filters translated to cents, pagination, optimistic loading and error banners.
- Add **JWT-protected flows**: login, logout, `/me`, blocked routes, cart, checkout confirmation.
- Improve **mobile layout**: replace a stacked header with a **burger menu**, drawer, backdrop, Escape-to-close, body scroll lock, and **responsive tests** (Vitest + Playwright viewport strategy).
- Add **automated tests**: Vitest for validation/utilities/context, Playwright **POM-oriented** mocks (`e2e/helpers/shop-api-mocks.ts`) and application specs covering happy paths and key negative cases.
- Align with workspace rules for **accessible** controls, stable test IDs where needed, and **lazy-loaded** routes with loading fallbacks to keep first paint lighter.

### 2.2 Backend

Typical prompts asked the assistant to:

- Use a **factory pattern** (`create_app`), **blueprints**, Marshmallow validation, JWT + optional Redis revocation, CORS tuned for Vite origins.
- Expose catalogue list/detail with **safe query handling** (pagination bounds, validated sort enums, bounded search strings, sane price-band validation).
- Model **multi-step registration** plus cart/order endpoints aligned with frontend flows.
- Add **Alembic** migrations, seed helpers, pytest coverage for catalogue queries, ecommerce flows, and config edge cases.

### 2.3 GitHub Actions

Prompts tended to:

- Split **backend** vs **frontend** workflows with path filters to avoid unnecessary CI.
- Backend: Python setup with **pip cache keyed** on lockfiles/pyproject plus `requirements*.txt`; **ruff** check + format check; **`pip-audit`**; DB/Redis services; **`flask db upgrade`** against a disposable Postgres; **pytest**.
- Frontend: Node setup; **eslint**, **`tsc --noEmit`**, **Vitest**; Playwright installing browsers; **`npm run build` + preview** or dev server parity for **E2E** with sensible timeouts and (where needed) deterministic viewport via `test.use` / exported config helpers.

---

## 3. SonarQube cleanup (~80+ issues)

Sonar scans combined **bugs**, **security hotspots**, **maintainability** (duplication, cognitive complexity, nested ternaries), and **style/consistency**. Work fell into fixes vs **documented false positives**.

### 3.1 Representative fixes

| Theme | Examples |
|--------|-----------|
| **Security / robustness** | Safer catalogue **ILIKE** handling (escape `%`/`_`/`\` so search terms cannot widen queries); JWT/JSON API CSRF rationale documented where session cookies aren’t used; ReDoS-leaning regex replaced with linear-time validation for email hints. |
| **Dependency reproducibility** | Introduced **`pyproject.toml`** + **`uv.lock`**, regenerated pinned **`requirements*.txt`** exports for pip-based CI and humans. |
| **Duplication / literals** | Shared HTTP error/description strings (`Unknown user`, registration finalized, etc.). |
| **Complexity / readability** | Broke apart large JSX (e.g. **Layout**, **Cart**, **Catalogue** main pane), Playwright mock **route dispatcher** with small handlers, flattened nested ternary UI. |
| **TypeScript / JSX hygiene** | `Readonly<>” props`; `globalThis`-consistent polyfills and guards; avoiding unnecessary casts; replacing `typeof x === 'undefined'` where direct `undefined` comparison is equivalent and safe (`globalThis.window`). |
| **Tests** | Stubs for ResizeObserver in jsdom; E2E **viewport** configuration so Tailwind breakpoints match assertions; removed redundant assertions in tests flagged by analyzers. |
| **API mocks** | Top-level **`bearer` / `authed`** helpers; `isJsonError` without redundant assertions (`Reflect.get`). |

### 3.2 Marked or treated as **false positives** (examples)

Sonar occasionally misfires on framework idioms or **stale paths**:

- Suggesting **`<img alt>`** for a full-screen nav **backdrop**: a dimmed overlay is not an image asset; semantics were corrected with an accessible **dimiss control** (e.g. labeled button) plus existing drawer controls (`aria-label`s, ESC).
- Issues pointing at **non-existent lines** (e.g. legacy line numbers on a minimal `e2e/pages/CatalogPage.ts`) after refactors → **won’t fix / obsolete** after re-scan on current default branch.
- Occasional **line-number drift** vs local files after merges; remediation is fresh analysis on the scanned commit.

A practical workflow was: fix obvious issues → re-run scanner → classify remainder (rule-specific suppressions vs documentation for auditors).

---

## 4. Lighthouse performance (~50 → 90+)

Lighthouse scores on **`npm run dev`** are misleading: Vite injects **`@vite/client`**, bundles are **unminified**, HMR/WebSockets cost **performance** and often **Best Practices**, and extensions add noise.

The jump to **90+ Performance** matched this sequence:

1. **Measure the shipped shape** — `npm run build` then `npm run preview` (production JS/CSS splitting, tree-shaking, minification). Run Lighthouse against **`http://127.0.0.1:4173`** (see root **README**).
2. **Code splitting at the router** — lazy routes for heavier pages so the initial catalogue path loads fewer bytes up front (`App.tsx` + route-level lazy + loading fallbacks).
3. **Network hints toward the API** — `dns-prefetch` / `preconnect` in `vite.config.ts` for `VITE_API_BASE_URL` so catalogue data can start resolving/tls-handshaking earlier.
4. **UI skeleton/fallback states** — avoid layout thrash during data fetches (catalogue skeleton) so perceived performance audits stay steadier.

If Performance is still depressed after preview builds, usual culprits are **extensions**, **CPU throttling** in DevTools, or auditing a **cold** preview tab without disable-cache discipline—always compare apples to apples after a preview hard refresh.

---

## 5. Lessons for the next project

1. **Lock early** Python + JS dependencies for Sonar/CISO friendliness (`uv.lock` / npm lockfiles) and regenerate exports when bumping pins.
2. **Scan production-like assets** for Lighthouse and for Sonar hotspots that disappear only on minified or split bundles.
3. **Keep analyzer feedback in a ledger**: fixed vs suppressed vs false-positive, so regression triage stays fast across sprints.

For day-to-day runbooks, Docker ports, Sonar Compose notes, and preview commands, the canonical entry point remains **`README.md`** at the repo root.
