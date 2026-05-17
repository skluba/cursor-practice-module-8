# ShopMart practice stack

Flask REST API (`backend`) and React + Vite frontend (`frontend`). Run them locally in two terminals (plus Docker for Postgres + Redis).

**Project narrative** — See **[docs/PROJECT_JOURNEY.md](./docs/PROJECT_JOURNEY.md)** for how this stack was assembled (prompt themes for frontend/backend/CI), the SonarQube cleanup (~80+ issues addressed or flagged false positive), and Lighthouse-oriented performance work (auditing production preview vs dev server).

## Prerequisites

- **Docker** (for Postgres and Redis via `docker compose`)
- **Python 3.12+** recommended
- **Node.js** / npm (current LTS is fine)

## 1. Start database and Redis

From the repository root:

```bash
docker compose up -d
```

This exposes Postgres on host **5434** (mapped to container **5432**) and Redis on host **6381** (mapped to container **6379**), matching `backend/app/config.py` defaults and `DATABASE_URL` / `REDIS_URL` (`app` / `app` / database `app`).

On **first** Postgres startup only, scripts under **`docker/postgres-init/`** run (including a **`sonar`** database for optional SonarQube).

### SonarQube (optional code review UI)

Compose includes **Docker Hardened Images** SonarQube **`dhi.io/sonarqube:26-debian13-dev`** on **`http://127.0.0.1:9000`** once Postgres is healthy.

1. **Pull access** — Ensure your machine can pull `dhi.io/sonarqube:26-debian13-dev` (use `docker login dhi.io` if your organization requires registry authentication).

2. **Resources** — SonarQube typically needs **about 2 GB RAM or more** for the JVM and embedded search; increase Docker Desktop memory if the container exits during startup.

3. **Existing Postgres volume** — Init scripts run **only when the Postgres data volume is empty**. If you already had `postgres_data` before `docker/postgres-init/` existed, create the Sonar DB manually:

   ```bash
   docker compose exec postgres psql -U app -d app -v ON_ERROR_STOP=1 -c \
     "CREATE USER sonar WITH PASSWORD 'sonar';" \
     -c "CREATE DATABASE sonar OWNER sonar;"
   ```

4. **Start SonarQube** — Bring services up (Sonar waits on a healthy Postgres):

   ```bash
   docker compose up -d
   ```

   Or only infra + Sonar: `docker compose up -d postgres redis sonarqube`. Follow **`docker compose logs -f sonarqube`** until the server is ready (first boot can take several minutes).

5. **Sign in** — Open **`http://127.0.0.1:9000`**. Defaults are **`admin` / `admin`**; you will be prompted to set a new password.

6. **Analyze this repo** — Create a **project** in the UI, generate a **token**, then run **`sonar-scanner`** from the repo root (install it locally or use Sonar’s scanner image). Example:

   ```bash
   sonar-scanner \
     -Dsonar.projectKey=shopmart-practice \
     -Dsonar.sources=backend,frontend/src \
     -Dsonar.host.url=http://127.0.0.1:9000 \
     -Dsonar.token=<YOUR_GENERATED_TOKEN>
   ```

   Adjust **`sonar.sources`**, exclusions, **`sonar.python.version`**, and coverage report paths (`sonar.python.coverage.reportPaths`, `sonar.javascript.lcov.reportPaths`, etc.) to match how you run tests.

7. **Linux hosts** — If Elasticsearch fails with **`vm.max_map_count`**, raise the sysctl limit per [SonarQube’s Docker installation notes](https://docs.sonarsource.com/sonarqube/latest/setup/install-server/installing-sonarqube-from-docker/). Docker Desktop on macOS/Windows often avoids this.

`SONAR_ES_BOOTSTRAP_CHECKS_DISABLE` is enabled in Compose for **local developer convenience only**; do not treat it as a production hardening choice.

## 2. Backend API

Open a terminal:

```bash
cd backend

python -m venv .venv
source .venv/bin/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env        # Edit SECRET_KEY, DATABASE_URL or REDIS_URL if needed.
```

**Locked dependencies** — `backend/uv.lock` pins the full transitive set (source of truth is `backend/pyproject.toml`). The `requirements*.txt` files are generated exports for `pip` (see their header comments): after changing dependencies, run **`uv lock`** then **`uv export ...`** again, or develop with **`uv sync --extra dev`** if you use `uv` locally.

```bash
export FLASK_APP=wsgi:app   # Windows CMD: set FLASK_APP=wsgi:app

flask db upgrade
flask run --debug
```

Default API URL: **`http://127.0.0.1:5000`**. Swagger UI lives under **`/openapi/swagger-ui`** (see `OPENAPI_*` settings in config).

### CORS and the SPA

The frontend dev server is usually **`http://127.0.0.1:5173`**. CORS defaults are set for Vite (`CORS_ORIGINS` in **`backend/.env.example`**); if you use another origin, append it to **`CORS_ORIGINS`** in `.env` (comma-separated, no paths).

## 3. Frontend

Open another terminal:

```bash
cd frontend

cp .env.example .env       # Ensures VITE_API_BASE_URL points at the API (default: http://127.0.0.1:5000)

npm install
npm run dev
```

Then open **`http://127.0.0.1:5173`**. Requests go to `VITE_API_BASE_URL`; keep the backend terminal running at the same time.

### Lighthouse — use a production preview

Development (`npm run dev`) carries **development** builds of React, injects **`@vite/client`** (HMR/WebSocket), and is **not minified**. Reports of large “unused JS”, missing minification, and **blocked back/forward cache** are largely **diagnostics of dev mode**, not your shipped assets. Extensions (password managers/autofill overlays) also inflate attribution.

Audit the optimized bundle instead:

```bash
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Point Lighthouse at **`http://127.0.0.1:4173`**.

The SPA injects **`dns-prefetch` / `preconnect`** toward `VITE_API_BASE_URL` (see **`vite.config.ts`**) so the catalogue API handshake can overlap earlier with script work. **`App.tsx`** lazy-loads route chunks (login, checkout, secondary screens) alongside accessible loading fallbacks (**`PageLoadingFallback`**, catalogue grid skeleton).

## Typical workflow summary

| Step | Terminal / action |
|------|-------------------|
| 1 | Root: `docker compose up -d` |
| 2 | `backend`: venv → `pip install` → `.env` → `flask db upgrade` → `flask run` |
| 3 | `frontend`: `.env` → `npm install` → `npm run dev` |

## Troubleshooting

- **DB connection errors** — Ensure Postgres is up (`docker compose ps`). First run requires **`flask db upgrade`**.
- **`401` after login / logout oddities** — Redis must be running (JWT blacklist). Use `docker compose` or a local Redis reachable at the URL in **`REDIS_URL`** (Compose default **`localhost:6381`**).
- **Browser blocks API calls** — Match **`CORS_ORIGINS`** on the backend to how you opened the SPA (exact origin, including `localhost` vs `127.0.0.1`).
- **Docker “port already allocated” / local collisions** — Edit the host (left) side in **`docker-compose.yml`** (`5434`, **`6381`**, **`9000`** for SonarQube, etc.) so it’s free on your machine, then set **`DATABASE_URL`** and **`REDIS_URL`** in **`backend/.env`** to the same host ports.
