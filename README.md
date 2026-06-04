# Sagar Motors — Accessories DSR & Sales Management

A cloud, multi-user web app for a TATA dealership group: daily sales on delivered cars,
parts purchase & stock transfer, CA / Team-Leader performance reports, zero-car & red-zone
tracking, team attendance, and one-click WhatsApp/SMS customer offers.

**Stack:** Node.js + Express API · PostgreSQL · plain-HTML/JS frontend (no build step).
Login uses hashed PINs (scrypt) and signed tokens. Data access is role-scoped on the server
(Admin → all; Team Leader → own team; Sales/CA → own records).

```
server.js     Express API + auth + static hosting of the UI
db.js         Postgres pool, schema init, first-boot seed, password hashing
schema.sql    Database tables (auto-applied on first start)
public/       index.html — the whole UI
```

---

## A. Run it locally (optional, to try before deploying)

You need Node 18+ and a PostgreSQL database (local install, or a free cloud one from Section B).

```bash
npm install
cp .env.example .env          # then put your DATABASE_URL in .env
# load env and start (mac/Linux):
export $(grep -v '^#' .env | xargs) && npm start
```

Open http://localhost:3000 and sign in with a demo account:

| Role          | Username | PIN  |
|---------------|----------|------|
| Manager/Admin | `admin`  | 1234 |
| Team Leader   | `atul`   | 1111 |
| Sales / CA    | `aakash` | 2222 |

> First start auto-creates the tables and seeds a starter roster + sample month of data so
> reports aren't empty. **Change the demo passwords** (User Accounts screen) before real use.

---

## B. Deploy to the cloud — free (Neon Postgres + Render)

This is the simplest free path. Total time ~10 minutes.

### Step 1 — Create the database (Neon, free)
1. Go to **https://neon.tech** → sign up → **Create project**.
2. Open **Dashboard → Connection string** and copy the `postgresql://…?sslmode=require` URL.
   Keep it handy — this is your `DATABASE_URL`.

(Any Postgres works here — Supabase, Railway, Render's own DB, etc. Neon's free tier doesn't expire.)

### Step 2 — Put the code on GitHub
1. Create a new empty repo on **https://github.com**.
2. Push this folder to it:
   ```bash
   git init && git add . && git commit -m "Sagar DSR"
   git branch -M main
   git remote add origin https://github.com/<you>/sagar-dsr.git
   git push -u origin main
   ```

### Step 3 — Deploy the app (Render, free)
1. Go to **https://render.com** → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
3. Add **Environment Variables**:
   - `DATABASE_URL` = the Neon string from Step 1
   - `JWT_SECRET`   = a long random string
     (generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
4. **Create Web Service.** Render builds and gives you a URL like
   `https://sagar-dsr.onrender.com` — that's your live app.

> Tip: the included `render.yaml` lets you instead use **Render → New → Blueprint**, which
> provisions the web service *and* a free Render Postgres together and links them automatically.

### After it's live
- Sign in as `admin / 1234`, go to **User Accounts**, change the admin PIN and add real
  Team-Leader and Sales accounts.
- **Roster / Teams → Bulk import (CSV)** to load all ~390 salespersons at once
  (columns: `Code, Name, Team Leader, Location`).

> The Render **free** web tier sleeps after ~15 min idle (first request then takes ~30s to wake).
> For an always-on dealership tool, upgrade that one service to the cheapest paid tier later —
> no code change needed.

---

## C. WhatsApp offers — important note
The one-click share opens WhatsApp/SMS with the message **and a PDF link** pre-filled
(via `wa.me` / `sms:`). Browsers/WhatsApp cannot auto-**attach** a PDF file from a link —
true file attachment needs the **WhatsApp Business Cloud API** (a Meta account + a sending
number). When you're ready, that becomes a single new server endpoint; the UI already collects
everything needed (message + PDF URL + recipient).

---

## D. Using MySQL instead of PostgreSQL
The app ships configured for **PostgreSQL** (recommended — the free hosts above are Postgres).
MySQL is possible but needs a few changes, since some SQL is Postgres-specific:
- swap the driver: `pg` → `mysql2`, and update the pool/`q()` in `db.js`;
- change placeholders `$1,$2…` to `?`;
- `SERIAL` → `INT AUTO_INCREMENT`, `BOOLEAN` is fine, `NUMERIC` → `DECIMAL`;
- `to_char(date,'YYYY-MM')` → `DATE_FORMAT(date,'%Y-%m')`;
- `INSERT … ON CONFLICT (…) DO UPDATE` → `INSERT … ON DUPLICATE KEY UPDATE`;
- `RETURNING *` isn't supported — do an insert then re-select by id.
If you specifically want MySQL (e.g. PlanetScale/Aiven free tiers), tell us and we'll provide a MySQL build.

---

## E. Security checklist before real customer data
- [ ] Change all seeded PINs; remove demo accounts you don't need.
- [ ] Set a strong, secret `JWT_SECRET` (never commit `.env`).
- [ ] Keep `DATABASE_URL` only in the host's env vars.
- [ ] Add database backups (Neon/Render both offer this).
- [ ] Put the site behind HTTPS (Render/most hosts do this automatically).

## API reference (all under `/api`, JSON, Bearer token except `/login`)
`POST /login` · `GET /me` · `GET /bootstrap?month=YYYY-MM`
`GET/POST /sales` · `PUT/DELETE /sales/:id`
`GET/POST /stock` · `PUT /stock/:id`
`GET/POST /attendance` · `POST /attendance/bulk`
`POST/PUT/DELETE /roster[/:code]` · `POST /roster/bulk`  *(admin)*
`POST/PUT/DELETE /offers[/:id]`
`POST/PUT/DELETE /users[/:id]`  *(admin)*
