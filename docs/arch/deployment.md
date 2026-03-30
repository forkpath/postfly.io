# Deployment Architecture

## Overview

```
                         ┌──────────────┐
          Client ──────► │   Kong :80   │
                         └──────┬───────┘
                                │
                   ┌────────────┴────────────┐
                   │                         │
            /api/* │                    /* (other)
                   ▼                         ▼
           ┌──────────────┐         ┌──────────────┐
           │ Engine :8000 │         │  Web  :3000  │
           │   (NestJS)   │         │ (TanStack SSR│
           └──────┬───────┘         └──────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
 PostgreSQL    MongoDB      Redis
   :5432       :27017       :6379
```

Kong acts as the API gateway / reverse proxy:
- `/api/*` → Engine (NestJS, port 8000)
- `/*`     → Web (TanStack Start SSR, port 3000)

## Docker Images

### Web (`docker/web.Dockerfile`)
Multi-stage build using Nitro to produce a self-contained SSR server.

- **Build**: Full monorepo → `nx run web:build` → Nitro bundles to `.output/`
- **Runtime**: `node .output/server/index.mjs` — only needs Node.js, no node_modules
- **Size**: ~50MB compressed
- `VITE_*` variables are **baked at build time** via `--build-arg`

### Engine (`docker/engine.Dockerfile`)
Multi-stage build using Nx prune for a minimal production bundle.

- **Build**: Full monorepo → `nx run engine:prune` → pruned lockfile + workspace modules
- **Runtime**: `node main.js` with production `node_modules`
- Environment variables are read at **runtime** via `ConfigService`

## Update Strategy

Deployments **only rebuild and restart application services** (engine, web).
Infrastructure containers (Redis, PostgreSQL, MongoDB, RabbitMQ, Kong, Konga)
are never touched during updates — their images are pinned to specific versions
and their data volumes are preserved.

```
┌─────────────────────────────────────────────────────┐
│  Infrastructure (started once, never redeployed)    │
│  redis:7.4 · postgres:17 · mongo:8.0               │
│  rabbitmq:4.0.1 · kong:3.9 · konga                 │
│  ↕ named volumes: ray-redis, ray-postgres, etc.     │
├─────────────────────────────────────────────────────┤
│  Application (rebuilt on every deploy)              │
│  engine · web                                       │
└─────────────────────────────────────────────────────┘
```

## First-time Server Setup

```bash
# 1. Clone repo to /opt
sudo mkdir -p /opt/ray && sudo chown $(whoami) /opt/ray
git clone <repo-url> /opt/ray && cd /opt/ray

# 2. Configure environment
cp .env.example docker/.env
# Edit docker/.env with production values

# 3. Start infrastructure first
./scripts/deploy.sh infra

# 4. Build and start app services
./scripts/deploy.sh build
./scripts/deploy.sh up

# 5. Run database migrations
./scripts/deploy.sh migrate
```

## Deploy Script (`scripts/deploy.sh`)

| Command | Description |
|---|---|
| `update` (default) | `git pull` → rebuild engine+web → restart engine+web |
| `build` | Build engine+web images only |
| `up` | Start all services |
| `restart` | Restart engine+web only (no rebuild) |
| `down` | Stop all services (volumes preserved) |
| `infra` | Start infrastructure only |
| `logs [service]` | Tail logs (default: engine web) |
| `status` | Show running containers |
| `migrate` | Run Prisma migrations |

`VITE_*` build args are read from `docker/.env` during `docker compose build`
via the `build.args` section in `docker-compose.yml`.

## Automatic Deployment via GitHub Actions

Pushing a tag on main triggers the deploy workflow (`.github/workflows/deploy.yml`):

```bash
git tag v1.0.0 && git push origin v1.0.0
```

The workflow will:
1. Verify the tag is on the `main` branch (tags on other branches are rejected)
2. SSH into the server
3. `git checkout` the tagged commit at `/opt/ray`
4. Run `./scripts/deploy.sh update` (only rebuilds engine + web)

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key (ed25519 recommended) |

### Optional GitHub Variables

| Variable | Default | Description |
|---|---|---|
| `DEPLOY_PORT` | `22` | SSH port |
| `DEPLOY_PATH` | `/opt/ray` | Project path on server |

### Server-side SSH setup

```bash
# 1. Generate SSH key pair (on your local machine)
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/ray-deploy

# 2. Add public key to server's authorized_keys
ssh-copy-id -i ~/.ssh/ray-deploy.pub user@server

# 3. Add private key content to GitHub Secrets as DEPLOY_SSH_KEY
cat ~/.ssh/ray-deploy
```

## Kong Configuration

Kong runs in **DB-less mode** with declarative config at `docker/kong/kong.yml`.

### Routing Rules

| Priority | Path | Upstream |
|---|---|---|
| 1 | `/api/auth/*` | `engine:8000` |
| 2 | `/api/*` | `engine:8000` |
| 3 | `/*` | `web:3000` |

### HTTPS & Let's Encrypt

Kong uses its built-in **ACME plugin** to automatically obtain and renew Let's Encrypt certificates.
Certificates are stored in Redis (database 1) and auto-renewed 30 days before expiry.

All HTTP requests are redirected to HTTPS via `301` (except `/.well-known/acme-challenge`
which must remain HTTP for Let's Encrypt validation).

Required environment variables in `docker/.env`:

```bash
DOMAIN=ray.example.com       # your production domain
ACME_EMAIL=admin@example.com  # Let's Encrypt account email
```

How it works:
1. On startup, `docker/kong/entrypoint.sh` replaces `${DOMAIN}`, `${ACME_EMAIL}`,
   `${REDIS_PASSWORD}` in the config template and produces the final `kong.yml`
2. Kong starts and listens on port 80 (HTTP) and 443 (HTTPS)
3. First HTTPS request triggers cert acquisition from Let's Encrypt
4. Subsequent HTTP requests are 301-redirected to HTTPS
5. Cert renewal is handled automatically by the ACME plugin

### Konga Admin UI
Available at port `1337` for managing Kong via browser. Connect to Kong Admin API at `http://kong:8001`.

## Environment Variables

### Build-time (`VITE_*`, baked into client JS)
These are injected at Docker build time via `--build-arg` and embedded into client-side JS bundles.

### Runtime — Web SSR Server (envin validation)
The project uses **envin** (Zod-based) to validate environment variables at module load time.
Even though `VITE_*` are baked into client JS, the SSR server also reads `process.env` at
runtime via envin's validation. Required variables like `VITE_PRODUCT_NAME`, `VITE_URL`,
`BETTER_AUTH_SECRET`, etc. must be available in the web container's runtime environment,
otherwise the SSR server will crash on startup with `EnvError: Invalid environment variables`.

For this reason, the web service uses `env_file: .env` — the same `.env` as the engine.

### Runtime (Engine)
All engine variables are read at startup. Key overrides in docker-compose:

| Variable | Docker Value | Description |
|---|---|---|
| `REDIS_HOST` | `redis` | Docker service name |
| `MONGO_HOST` | `mongo` | Docker service name |
| `POSTGRES_HOST` | `postgres` | Docker service name |
| `RABBITMQ_URI` | `amqp://...@rabbitmq:5672` | Uses Docker service name |
| `CORS_ORIGINS` | Your domain | Must match the public URL |

## Updating Services

### Manual (on server)

```bash
cd /opt/ray
./scripts/deploy.sh          # git pull → rebuild engine+web → restart
./scripts/deploy.sh migrate  # if schema changed
```

### Via tag push (automated)

```bash
git tag v1.0.1 && git push origin v1.0.1
# GitHub Actions → SSH → server → rebuild engine+web → restart
```
