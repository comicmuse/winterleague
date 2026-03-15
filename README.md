# ⛳ Winter League

A web application to track the results of a ladies golf winter league.

## Features

- **Competition Entry** — Enter results with date, competition name, and player scores. Configure the number of scoring places (3–10). Places are automatically assigned from scores (lowest = best), with ties handled automatically.
- **League Table** — Points-based standings (configurable: Top-5 = 5 pts for 1st down to 1 pt for 5th). Tiebreaks on head-to-head 1sts, 2nds, etc.
- **Player Profiles** — Individual pages showing placement history, total points, wins, and best score across the season.
- **Excel Export** — One-click download of all results, the league table, and competition summary in `.xlsx` format.
- **Authentication** — Single-user credentials-based login (username + password via environment variables).
- **Responsive Design** — Works on desktop and mobile.

## Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Framework   | [Next.js 16](https://nextjs.org) (App Router) |
| Database    | SQLite (dev) / [Turso](https://turso.tech) libSQL (prod) via Prisma 7 |
| ORM         | [Prisma 7](https://www.prisma.io)       |
| Auth        | [NextAuth.js v5](https://authjs.dev)    |
| Styling     | [Tailwind CSS v4](https://tailwindcss.com) |
| Export      | [xlsx](https://sheetjs.com)             |
| Hosting     | [Vercel](https://vercel.com)            |

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/comicmuse/winterleague.git
cd winterleague

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set your values (see Configuration section below)

# 4. Run database migrations
npx prisma migrate dev

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your configured credentials.

---

## Configuration

Copy `.env.example` to `.env` and set the following variables:

| Variable             | Description                                      | Example                        |
|----------------------|--------------------------------------------------|--------------------------------|
| `DATABASE_URL`       | Database connection string                       | `file:./prisma/dev.db`        |
| `DATABASE_AUTH_TOKEN`| Auth token for Turso (production only)           | *(leave blank for SQLite)*     |
| `AUTH_SECRET`        | NextAuth secret (generate: `openssl rand -base64 32`) | `abc123...`            |
| `ADMIN_USERNAME`     | Login username                                   | `admin`                        |
| `ADMIN_PASSWORD`     | Login password                                   | `changeme`                     |

---

## Deployment to Vercel

### Option 1 — Vercel + Turso (Recommended)

[Turso](https://turso.tech) is a serverless SQLite platform that works seamlessly with Vercel.

1. **Create a Turso database:**
   ```bash
   npm install -g @turso/cli
   turso auth login
   turso db create winterleague
   turso db show winterleague   # note the URL
   turso db tokens create winterleague  # note the token
   ```

2. **Run migrations against Turso:**
   ```bash
   DATABASE_URL="libsql://your-db.turso.io" \
   DATABASE_AUTH_TOKEN="your-token" \
   npx prisma migrate deploy
   ```

3. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```
   Or connect your GitHub repository via the [Vercel dashboard](https://vercel.com/new).

4. **Set environment variables in Vercel:**
   - `DATABASE_URL` → your Turso database URL (`libsql://...`)
   - `DATABASE_AUTH_TOKEN` → your Turso auth token
   - `AUTH_SECRET` → a secure random string (`openssl rand -base64 32`)
   - `ADMIN_USERNAME` → your admin username
   - `ADMIN_PASSWORD` → a secure password

### Option 2 — Vercel Postgres

1. In the Vercel dashboard, add a **Postgres** database to your project.
2. Update `prisma/schema.prisma` to use `postgresql` as the provider.
3. Run `npx prisma migrate deploy` in your CI or as a build step.

---

## CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`/`master`:

- Installs dependencies
- Generates the Prisma client
- Runs ESLint
- Builds the Next.js application

Vercel automatically deploys:
- **Production** on every push to `main`/`master`
- **Preview** on every pull request

---

## Database Schema

```
Competition    Player
──────────     ──────
id             id
name           name
date           createdAt
topPlaces      results []
createdAt
updatedAt
results []

Result
──────
id
competitionId
playerId
place          (auto-calculated from score)
score
createdAt
```

---

## Scoring System

Points are awarded to the top N players (configurable per competition, default = 5):

| Place | Points (Top 5) |
|-------|----------------|
| 1st   | 5              |
| 2nd   | 4              |
| 3rd   | 3              |
| 4th   | 2              |
| 5th   | 1              |
| 6th+  | 0              |

Players who share a place receive the same points. The next place is skipped (e.g., two 2nds → next is 4th).

League tiebreaks are resolved by: most 1sts → most 2nds → most 3rds → alphabetical.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── competitions/         # Competition CRUD API
│   │   ├── players/              # Player API
│   │   └── export/               # Excel export API
│   ├── competitions/
│   │   ├── [id]/                 # Competition detail page
│   │   └── new/                  # Enter results page
│   ├── players/
│   │   └── [id]/                 # Player profile page
│   ├── login/                    # Login page
│   └── page.tsx                  # League table (home)
├── components/
│   ├── Navbar.tsx
│   └── AuthProvider.tsx
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   └── scoring.ts                # Points & place calculation
├── generated/prisma/             # Generated Prisma client
└── proxy.ts                      # Auth middleware
```
