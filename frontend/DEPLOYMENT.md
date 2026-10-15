# IKORI Vercel deployment

## Seeded frontend deployment

The frontend is intentionally deployable without the ML backend. Do not set a live API URL for the seeded demo.

1. Import the repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Build command: `npm run deploy:check`.
4. Output directory: `dist`.
5. Set `VITE_FABLE_MODE=recording` and `VITE_DEMO_MODE=true` if environment variables are configured explicitly.

`vercel.json` preserves SPA deep links including `/product`, `/results`, and `/product/case/:id`.

## Switching to the backend

When the API is ready, configure these Vercel environment variables:

```text
VITE_FABLE_MODE=live
VITE_DEMO_MODE=false
VITE_API_URL=https://your-api.example.com
```

The backend must allow the deployed Vercel origin through CORS and return the versioned analysis contract in `src/api/analysisContract.ts`. Never store service credentials in `VITE_*` variables because Vite exposes them to the browser.

## Pre-deploy verification

```bash
npm ci
npm run deploy:check
```

After deployment verify `/`, `/product?view=3d-graph`, `/product?view=matrix`, `/product?view=access-requests`, `/results`, and a direct `/product/case/104` load.
