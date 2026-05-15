<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/97f4d253-8068-48f2-8ea5-e8f4d39cab7d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy API to Cloudflare Workers

The Worker entrypoint is `src/worker.ts`. It replaces the Render API while continuing to use Turso.

1. Install dependencies:
   `npm install`
2. Login to Cloudflare:
   `npx wrangler login`
3. Set Worker secrets:
   `npx wrangler secret put TURSO_DATABASE_URL`
   `npx wrangler secret put TURSO_AUTH_TOKEN`
   `npx wrangler secret put JWT_SECRET`
   `npx wrangler secret put VITE_GOOGLE_CLIENT_ID`
   `npx wrangler secret put ADMIN_EMAIL`
4. Optional, only if exporting registrations to Google Sheets:
   `npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL`
   `npx wrangler secret put GOOGLE_PRIVATE_KEY`
5. Deploy:
   `npm run deploy:worker`
6. Set GitHub Pages secret `VITE_API_BASE_URL` to the Worker URL, for example:
   `https://internship-api.<your-subdomain>.workers.dev`

### Auto deploy Worker from GitHub Actions

The workflow `.github/workflows/deploy-worker.yml` deploys the Worker automatically when `main` changes `src/worker.ts`, `wrangler.toml`, or package files.

Add these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Cloudflare Worker runtime secrets such as `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `JWT_SECRET` are still stored in Cloudflare via `wrangler secret put`; they are not stored in GitHub Actions.
