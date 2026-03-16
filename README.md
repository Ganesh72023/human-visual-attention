# Human Visual Attention Analyzer

Full-stack MERN + ML microservice project that analyzes emotion and attention-relevant behaviors from uploaded images/videos and generates cognitive-science grounded suggestions.

## Local (Docker)

From `human-visual-attention/`:

```bash
docker-compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/health`
- ML service: `http://localhost:8000/health`
- MongoDB: `mongodb://localhost:27017`

## Local (No Docker)

1) Start MongoDB (local or Atlas)
2) ML service:

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

3) Backend:

```bash
cd server
cp .\\.env.example .\\.env
npm install
npm run dev
```

4) Frontend:

```bash
cd client
npm install
npm run dev
```

## Admin Setup

Set env vars and seed an admin:

```bash
cd server
set ADMIN_EMAIL=admin@example.com
set ADMIN_PASSWORD=adminpassword
npm run seed:admin
```

With Docker:

```bash
docker-compose exec backend npm run seed:admin
```

Admin login UI: `http://localhost:5173/admin/login`

## MongoDB Atlas Notes

If your MongoDB password contains special characters (like `@`), URL-encode it in the connection string (for example `@` becomes `%40`) before putting it into `MONGODB_URI`.

## Key API Endpoints

Backend:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/admin/login`
- `GET /api/auth/me`
- `POST /api/uploads` (multipart `file`)
- `GET /api/uploads`
- `GET /api/uploads/:id`
- `GET /api/stats/summary`
- `GET /api/admin/export/csv`

ML service:
- `GET /health`
- `POST /analyze` (multipart `file`, `fileType=image|video`)
