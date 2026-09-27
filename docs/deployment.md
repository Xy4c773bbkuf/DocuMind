# Deployment

## Recommended MVP setup

- Frontend: Vercel, rooted at `frontend`
- API and PostgreSQL: Render, created from the repository `render.yaml`
- Gemini: Render secret environment variable
- Original files: Render local storage for a demo; move to S3 or another object store before production

## Render

1. Open Render and choose **New > Blueprint**.
2. Connect `Xy4c773bbkuf/DocuMind`.
3. Select the `render.yaml` file.
4. Enter `GEMINI_API_KEY` when Render asks for the secret.
5. After the API is created, copy its public URL, for example `https://documind-api.onrender.com`.
6. The API health check is `https://<api-host>/api/health`.

Render creates the PostgreSQL database and supplies its connection string. The backend normalizes Render's `postgres://` value to the async `postgresql+psycopg://` driver automatically.

Set `CORS_ORIGINS` in the Render API service after Vercel creates the frontend, for example:

```text
https://documind.vercel.app
```

The free Render filesystem is ephemeral. Metadata remains in PostgreSQL, but uploaded originals can disappear when the service is redeployed. For a durable deployment, replace `backend/app/storage.py` with S3-compatible storage or attach a Render persistent disk on a paid service.

## Vercel

1. Open Vercel and choose **Add New > Project**.
2. Import `Xy4c773bbkuf/DocuMind`.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Add this environment variable:

```text
VITE_API_URL=https://<api-host>/api
```

The included `frontend/vercel.json` sends SPA routes to `index.html`.

After deployment, copy the Vercel URL into Render's `CORS_ORIGINS`, redeploy the API, and test registration, login, upload, search, tags, download, and Gemini Q&A.

## Local verification

```powershell
cd frontend
npm run build
cd ..
cd backend
python -m pytest -q
```
