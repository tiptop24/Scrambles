# Scrambles — Premier League Pick 'Em

A dead-simple survivor pool for the Premier League:

- Pick **one team** to win each gameweek.
- **Win and you survive.** A draw or a loss eliminates you.
- You can **never pick the same team twice** in a season.
- **Goal difference** across all your picks is the tiebreaker for final standings.

No accounts, no passwords — create a pool, share the invite link, and everyone
picks by name. Built to be shared in a group chat and played casually all
season.

### Built to spread

Every moment worth bragging (or roasting) about has a one-tap share button
(native share sheet on mobile, clipboard copy on desktop):

- **Inviting friends** — from the pool header.
- **Locking in a pick** — "Casey is riding with Liverpool in Gameweek 4..."
- **Getting eliminated** — the highest-signal share in any survivor pool;
  people share their eliminations to gloat about how far they got or to bait
  a rematch.
- **The admin's weekly recap** — a ready-to-paste "results are in" message
  for the group chat after each gameweek locks.

Pool links also carry per-pool Open Graph metadata **and a generated preview
image** (`pool/[code]/opengraph-image.tsx`, live pool name + gameweek + alive
count), so a shared invite unfurls as a real image card in iMessage/WhatsApp/
Slack/Discord instead of a bare URL — image-rich previews get opened far more
than plain text ones. Set `NEXT_PUBLIC_SITE_URL` in production (see
`.env.example`) so those images resolve to the real domain instead of
`localhost`.

The app is also installable: a branded favicon/apple-touch-icon and a
`manifest.ts` (192/512 icons, standalone display) let players add it to their
phone's home screen — a season runs 38 gameweeks, so a one-tap icon beats
digging up the link in a group chat every week.

### Ready for public traffic

A viral loop only helps if the app survives being shared widely:

- Pool creation and joining are rate-limited per client (`src/lib/rateLimit.ts`)
  so a spam bot can't flood the database with junk pools/players.
- `robots.txt` allows crawling the homepage for organic discovery but blocks
  `/pool/*` — those links are shared privately by invite, not meant to be
  indexed.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS** for styling
- **Prisma + SQLite** for storage (swap the `DATABASE_URL` for Postgres/etc.
  in production — the schema has no SQLite-specific types)
- **Vitest** for the rules engine's unit tests

## Getting started

```bash
npm install
npm run db:push    # creates prisma/dev.db from the schema
npm run db:seed     # seeds the 2025-26 Premier League teams + a demo pool
npm run dev          # http://localhost:3000
```

The seed script prints a demo pool's invite code — open
`http://localhost:3000/pool/<CODE>` to try it immediately, or go to
`http://localhost:3000/pool/<CODE>/admin` to add gameweek fixtures and enter
results.

Run the rules-engine tests with:

```bash
npm test
```

## How a pool works

1. **Create a pool** on the homepage — you get a short invite code and link.
2. **Share the link.** Anyone who opens it can join by typing a name (no
   sign-up).
3. **Admin sets fixtures** for the current gameweek at `/pool/<CODE>/admin`
   (there's no live score feed wired up yet — see below).
4. **Players pick** a team from that gameweek's fixtures. Once you've used a
   team, it's gone for the rest of the season.
5. **Admin enters final scores.** Submitting locks the gameweek: everyone
   whose team won survives, everyone else — including anyone who forgot to
   pick — is eliminated.
6. **Standings** always rank everyone still alive above everyone eliminated;
   within each group, cumulative goal difference across every scored pick
   breaks ties.

There's no account system by design — whoever holds the pool's admin link is
trusted to run it, the same way one person runs a group-chat pool. That's a
deliberate scope cut for the MVP, along with manual fixture/result entry
instead of a live football-data API integration.

## Project layout

```
prisma/schema.prisma        Data model (Pool, Player, Team, GameWeek, Fixture, Pick)
prisma/seed.ts               Seeds the 20 PL teams + a demo pool
src/lib/gameLogic.ts         Pure rules engine: pick validation, elimination,
                              goal-difference standings — fully unit tested
src/lib/gameLogic.test.ts    Vitest coverage for every rule above
src/app/api/pools/**         REST-ish route handlers backing the UI
src/app/page.tsx             Landing page — create/join a pool
src/app/pool/[code]/page.tsx Pick screen + standings
src/app/pool/[code]/admin/   Fixture entry + results entry
```

## What's intentionally out of scope for v1

- Live fixture/result feeds (admin enters both by hand)
- Accounts/auth (name-only, stored in the browser's localStorage)
- Multi-season history
