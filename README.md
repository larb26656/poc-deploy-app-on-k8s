# catalog-platform

pnpm monorepo ที่มี 2 NestJS services + PostgreSQL รันด้วย Docker Compose ครบในคำสั่งเดียว

## Services และ Ports

| Component            | Host Port | ใช้ทำอะไร                                        |
| -------------------- | --------- | ------------------------------------------------ |
| `catalog-service`    | **43117** | อ่านข้อมูลจาก PostgreSQL และเรียก availability   |
| `availability-service` | **43118** | ให้ข้อมูล availability ให้ catalog-service เรียก  |
| `catalog-postgres`   | **45432** | PostgreSQL 17 (persistent volume `catalog_pgdata`) |

เลือก port แปลกๆ เพื่อหลีกเลี่ยง conflict กับ 3000/5432 ที่มักถูกใช้แล้ว

## Endpoints

### catalog-service (`http://localhost:43117`)

| Method | Path                          | คำอธิบาย                              |
| ------ | ----------------------------- | -------------------------------------- |
| GET    | `/health`                     | Health check (ตรวจ PostgreSQL ด้วย)    |
| GET    | `/api/v1/catalog/items`       | อ่านรายการ items จาก PostgreSQL        |
| GET    | `/api/v1/catalog/availability` | ไปเรียก availability-service ต่อ       |

### availability-service (`http://localhost:43118`)

| Method | Path                            | คำอธิบาย                              |
| ------ | ------------------------------- | -------------------------------------- |
| GET    | `/health`                       | Health check                          |
| GET    | `/api/v1/internal/availability` | endpoint สำหรับ catalog-service เรียก  |

## รันด้วย Docker

```bash
cp .env.example .env   # ปรับ port/credentials ได้ตามต้องการ
pnpm up                # = docker compose up --build -d
```

ตรวจสอบ:

```bash
curl http://localhost:43117/health
curl http://localhost:43117/api/v1/catalog/items
curl http://localhost:43117/api/v1/catalog/availability
curl http://localhost:43118/health
curl http://localhost:43118/api/v1/internal/availability
```

หยุด:

```bash
pnpm down              # ลบ containers (volume ยังอยู่)
docker compose down -v # ลบทั้ง volume
```

## Docker images (แยกไฟล์ต่อ service)

แต่ละ service มี Dockerfile ของตัวเอง (multi-stage: deps → build → bundle → runtime)
build ต้องใช้ context เป็น root ของ monorepo เพราะต้องใช้ lockfile:

```bash
docker build -f apps/catalog-service/Dockerfile -t catalog-service .
docker build -f apps/availability-service/Dockerfile -t availability-service .
```

- `pnpm deploy --prod` ให้ output เฉพาะ production dependencies ของ service นั้น
- image รันด้วย non-root user `app` และ EXPOSE port ตาม service (43117 / 43118)

## รันสำหรับพัฒนา (without Docker)

```bash
pnpm install
docker run -d --name catalog-postgres -p 45432:5432 \
  -e POSTGRES_USER=catalog_app -e POSTGRES_PASSWORD=catalog_secret \
  -e POSTGRES_DB=catalog_db postgres:17-alpine

pnpm dev:availability   # terminal 1
pnpm dev:catalog        # terminal 2
```

## HTTP Request Logging

ใช้ [nestjs-pino](https://github.com/iamolegga/nestjs-pino) (สร้างบน `pino-http`) เป็น logger
ทั้ง request logging และ built-in `Logger` ของ NestJS ทั้งสอง services:

```text
{ level, time, reqId, req: { method, url, headers }, res: { statusCode }, responseTime }
```

- **ไม่มี request/response body** โดยตั้งใจ เพื่อไม่ให้ข้อมูล sensitive รั่วไหล
- ทุก response จะมี header `x-request-id` (สร้างใหม่หรือใช้ที่ส่งมา ผ่าน `genReqId`)
- เมื่อ catalog-service เรียก availability-service จะ propagate `x-request-id`
  ทำให้ไล่ request เดียวกันข้าม service ได้

## โครงสร้าง

```text
apps/
  catalog-service/
    Dockerfile             # multi-stage build เฉพาะ catalog-service (port 43117)
  availability-service/
    Dockerfile             # multi-stage build เฉพาะ availability-service (port 43118)
docker-compose.yml         # 2 services + postgres
```

## Deployment notes

- ทุก image รันด้วย non-root user `app`
- ใช้ `pnpm deploy --prod` ให้ได้ image เฉพาะ production dependencies
- ใน compose มี healthcheck ทุก container และ `depends_on: service_healthy`
- `DB_SYNCHRONIZE=true` เหมาะกับ demo/dev — สำหรับ production จริง
  ควรปิดและใช้ TypeORM migrations แทน
