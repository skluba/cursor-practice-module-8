# ShopMart practice stack

Flask REST API (`backend`) and React + Vite frontend (`frontend`). Run them locally in two terminals (plus Docker for Postgres + Redis).

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

## 2. Backend API

Open a terminal:

```bash
cd backend

python -m venv .venv
source .venv/bin/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env        # Edit SECRET_KEY, DATABASE_URL or REDIS_URL if needed.

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
- **Docker “port already allocated” / local collisions** — Edit the host (left) side in **`docker-compose.yml`** (`5434`, **`6381`**, etc.) so it’s free on your machine, then set **`DATABASE_URL`** and **`REDIS_URL`** in **`backend/.env`** to the same host ports.
