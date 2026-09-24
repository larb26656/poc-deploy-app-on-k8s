# catalog-platform

pnpm monorepo with 2 NestJS services + PostgreSQL, runnable via Docker Compose in a single command

## Services and Ports

| Component              | Host Port | Purpose                                             |
| ---------------------- | --------- | --------------------------------------------------- |
| `catalog-service`      | **43117** | Reads data from PostgreSQL and calls availability    |
| `availability-service` | **43118** | Serves availability data for catalog-service         |
| `catalog-postgres`     | **45432** | PostgreSQL 17 (persistent volume `catalog_pgdata`)   |

Unusual ports were chosen to avoid conflicts with 3000/5432, which are usually taken.

## Endpoints

### catalog-service (`http://localhost:43117`)

| Method | Path                           | Description                                        |
| ------ | ------------------------------ | -------------------------------------------------- |
| GET    | `/health`                      | Health check (also checks PostgreSQL)              |
| GET    | `/api/v1/catalog/items`        | Lists items from PostgreSQL                        |
| GET    | `/api/v1/catalog/availability` | Proxies to availability-service                    |

### availability-service (`http://localhost:43118`)

| Method | Path                            | Description                                        |
| ------ | ------------------------------- | -------------------------------------------------- |
| GET    | `/health`                       | Health check                                       |
| GET    | `/api/v1/internal/availability` | Endpoint called by catalog-service                 |

## Run with Docker

```bash
cp .env.example .env   # adjust ports/credentials as needed
pnpm up                # = docker compose up --build -d
```

Verify:

```bash
curl http://localhost:43117/health
curl http://localhost:43117/api/v1/catalog/items
curl http://localhost:43117/api/v1/catalog/availability
curl http://localhost:43118/health
curl http://localhost:43118/api/v1/internal/availability
```

Stop:

```bash
pnpm down              # remove containers (volume is kept)
docker compose down -v # remove containers and volume
```

## Docker images (one Dockerfile per service)

Each service has its own Dockerfile (multi-stage: deps → build → bundle → runtime).
Builds must use the monorepo root as context because the lockfile is required:

```bash
docker build -f apps/catalog-service/Dockerfile -t catalog-service .
docker build -f apps/availability-service/Dockerfile -t availability-service .
```

- `pnpm deploy --prod` produces output containing only that service's production dependencies
- Images run as non-root user `app` and EXPOSE the service port (43117 / 43118)

## Development (without Docker)

```bash
pnpm install
docker run -d --name catalog-postgres -p 45432:5432 \
  -e POSTGRES_USER=catalog_app -e POSTGRES_PASSWORD=catalog_secret \
  -e POSTGRES_DB=catalog_db postgres:17-alpine

pnpm dev:availability   # terminal 1
pnpm dev:catalog        # terminal 2
```

## Deploy on Kubernetes (minikube)

Manifests live in `deployment/` — the namespace is `poc-deploy-app-on-k8s`.
All Services are `ClusterIP`, so `kubectl port-forward` is required to reach them from your machine.

### 1. Build images (skip if pulling from Docker Hub)

The manifests use `errortime/catalog-service:0.0.1` and `errortime/availability-service:0.0.1`.
To build them directly into minikube (without pushing to a registry), point your docker client at the minikube daemon first:

```bash
eval $(minikube docker-env)
docker build -f apps/catalog-service/Dockerfile -t errortime/catalog-service:0.0.1 .
docker build -f apps/availability-service/Dockerfile -t errortime/availability-service:0.0.1 .
```

### 2. Apply manifests (in order)

```bash
kubectl apply -f deployment/namespace.yaml
kubectl apply -f deployment/secret-map.yaml
kubectl apply -f deployment/config-map.yaml
kubectl apply -f deployment/postgresql.yaml
kubectl apply -f deployment/availability-service.yaml
kubectl apply -f deployment/catalog-service.yaml
```

Or apply everything at once (the folder is processed in filename order):

```bash
kubectl apply -f deployment/
```

### 3. Verify

```bash
kubectl get pods,svc -n poc-deploy-app-on-k8s
```

Wait until pods are `Running` and `READY x/x`:

```text
pod/availability-service-xxx   2/2   Running
pod/catalog-service-xxx        2/2   Running
pod/postgres-xxx               1/1   Running
```

### 4. Forward ports from your machine into the cluster

```bash
kubectl port-forward -n poc-deploy-app-on-k8s svc/catalog-service 43117:43117
kubectl port-forward -n poc-deploy-app-on-k8s svc/availability-service 43118:43118
```

Each command occupies one terminal (or run them in the background):

```bash
kubectl port-forward -n poc-deploy-app-on-k8s svc/catalog-service 43117:43117 &
kubectl port-forward -n poc-deploy-app-on-k8s svc/availability-service 43118:43118 &
```

Then curl the same endpoints as with Docker:

```bash
curl http://localhost:43117/health
curl http://localhost:43117/api/v1/catalog/items
curl http://localhost:43117/api/v1/catalog/availability
curl http://localhost:43118/health
curl http://localhost:43118/api/v1/internal/availability
```

Stop port-forwarding with `Ctrl+C` (or `kill %1 %2` when running in the background).

### 5. Clean up

```bash
kubectl delete namespace poc-deploy-app-on-k8s
```

## HTTP Request Logging

Both services use [nestjs-pino](https://github.com/iamolegga/nestjs-pino) (built on `pino-http`)
for request logging as well as the built-in NestJS `Logger`:

```text
{ level, time, reqId, req: { method, url, headers }, res: { statusCode }, responseTime }
```

- **No request/response bodies** by design, to prevent sensitive data from leaking
- Every response carries an `x-request-id` header (newly generated or reused from the incoming request via `genReqId`)
- When catalog-service calls availability-service, it propagates `x-request-id`,
  so a single request can be traced across services

## Project Structure

```text
apps/
  catalog-service/
    Dockerfile             # multi-stage build for catalog-service (port 43117)
  availability-service/
    Dockerfile             # multi-stage build for availability-service (port 43118)
docker-compose.yml         # 2 services + postgres
deployment/                # k8s manifests (namespace, secret, configmap, postgres, 2 services)
```

## Deployment notes

- All images run as non-root user `app`
- `pnpm deploy --prod` keeps images limited to production dependencies
- Compose defines healthchecks on every container plus `depends_on: service_healthy`
- `DB_SYNCHRONIZE=true` is fine for demo/dev — for real production,
  disable it and use TypeORM migrations instead
