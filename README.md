# Score Ads Manager

Private Google Ads campaign creation and management dashboard for Score Sports Bar & Grill, Phnom Penh.

## Stack

- Next.js 14 App Router with TypeScript
- Tailwind CSS and shadcn-style Radix UI components
- Supabase Auth, Postgres, Row Level Security, and Storage
- Google Ads REST API v23 via server-side `fetch`
- Zustand for wizard state
- React Hook Form and Zod validation
- Recharts for reporting charts

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy .env.local.example .env.local
```

3. Fill these required values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the Supabase migration in `supabase/migrations/001_initial_schema.sql`.

5. Set the database encryption key used by pgcrypto before saving credentials:

```sql
alter database postgres set app.google_ads_encryption_key = 'replace-with-at-least-32-random-characters';
```

Restart the Supabase database connection after setting it.

6. Create the owner user in Supabase Auth with email and password. The app is built for a maximum of two private owner users.

7. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/login`.

## Google Ads Setup

1. In Google Ads, request a developer token from Tools & Settings > Setup > API Center.
2. Basic Access is required for production accounts and Keyword Planner. Test account tokens cannot call production Keyword Planner endpoints.
3. In Google Cloud Console, create an OAuth 2.0 Web Application client.
4. Add this authorized redirect URI:

```text
http://localhost:3000/api/google-ads/auth/callback
```

For production, also add:

```text
https://score-ads.vercel.app/api/google-ads/auth/callback
```

5. Sign in to Score Ads Manager, open `/connect`, and complete the wizard:

- Save developer token.
- Save OAuth client ID and secret.
- Connect the Google account with OAuth consent.
- Save the Google Ads customer ID without hyphens.
- Run Test Connection.

## Campaign Creation Flow

The push route streams progress events while it runs this Google Ads sequence:

1. Create campaign budget.
2. Create campaign.
3. Add campaign location and language criteria.
4. Create ad group.
5. Add search keywords when relevant.
6. Use uploaded Google Ads image asset resource names when relevant.
7. Create the ad.

If a later step fails, the API response includes rollback awareness with already-created resource names because Google Ads mutate calls are not transactional.

## Deployment

1. Create a Vercel project from this repository.
2. Add the same environment variables from `.env.local.example`.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL.
4. Add the production OAuth redirect URI in Google Cloud Console.
5. Deploy.

The included `vercel.json` keeps API responses uncached and raises max duration for campaign creation and image upload routes.
