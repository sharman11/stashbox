# Stashbox — Landing Site

Marketing site for Stashbox. **Completely separate from the Expo app** — different `package.json`, different `node_modules`, different deploy target.

Excluded from the mobile bundle via `.easignore` and `metro.config.js` `blockList` at the repo root.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS 3
- TypeScript
- DM Sans via `next/font/google`

## Local dev

```bash
cd landing
npm install
npm run dev
```

Open <http://localhost:3000>.

## Build

```bash
npm run build
npm run start
```

## Deploy

Easiest path is Vercel:

```bash
cd landing
npx vercel
```

When prompted, point Vercel at the `landing/` directory (not the repo root). Set the production domain to whatever you registered.

## Wiring the waitlist form

The form in `components/Waitlist.tsx` currently uses a `mailto:` fallback so it works without a backend. Before going live, swap the `action` to one of:

- **Formspree** — `https://formspree.io/f/<your-id>` (zero infra, free tier)
- **Buttondown** — `https://buttondown.email/api/emails/embed-subscribe/stashbox`
- **Resend + a Next.js route handler** at `app/api/waitlist/route.ts`

Search for the marker comment inside `Waitlist.tsx` to find the exact spot.

## What to edit before launch

- `app/privacy/page.tsx` — review the privacy policy. Replace any placeholder facts (data hosts, retention) with your real ones.
- `app/terms/page.tsx` — same review pass.
- `components/Hero.tsx` — when stores go live, replace the `<StoreBadge disabled />` calls with real `<a href="...">` links to your Play / App Store listings.
- `app/layout.tsx` — confirm the `metadataBase` URL matches your real domain.
- `next.config.mjs` — add any redirects you want (e.g. `/playstore` → real listing).

## How this stays out of the mobile app bundle

Two safety nets at the repo root:

1. **`.easignore`** lists `landing/`, so EAS Build won’t upload it.
2. **`metro.config.js`** has `landing/` in its `blockList`, so Metro won’t resolve any file inside it even if something accidentally imports from there.

If you ever move this folder, update both files.
