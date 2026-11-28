# CV Editor Share Worker (Cloudflare Worker + D1)

Lightweight, anonymous short-link backend for `cv-editor` with strict free-tier safeguards:

- **Per-IP Limit**: 100 share creations/renewals per UTC day (`IP_DAILY_LIMIT = 100`).
- **TTL**: 3 days (`TTL_DAYS = 3`), cleaned up lazily on read/write and via cron (`0 */6 * * *`).
- **Global 40% Free-Tier Cap**:
  - 40,000 requests/day (40% of 100k)
  - 40,000 D1 row writes/day (40% of 100k)
  - 2,000,000 D1 row reads/day (40% of 5M)
  - 200 MB D1 storage cap (40% of 500 MB)
- **Payload Cap**: 64 KB compressed deflate-raw base64url, validated as CV JSON.

## Setup

```bash
cd worker
npm install
npx wrangler d1 create cv-editor-shares
# Put the returned database_id into wrangler.toml
npm run db:init:remote
npm run deploy
```

The production Worker is `https://cv-editor-share-worker.phambuinamphuong.workers.dev`. Set `VITE_SHARE_API_URL` to that URL when building the frontend so the Share Manager can create, read, renew and delete short links.
