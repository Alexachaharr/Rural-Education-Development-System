# Vidya Setu: Rural Education Development System

A learning platform for rural schools. Students get NCERT chapters with videos and downloadable notes, timed quizzes, their attendance and scholarships. Teachers upload material, mark attendance and create quizzes. Parents follow their child's attendance and scores.

**Stack:** React 19 + Vite + TypeScript (frontend), Node.js + Express + SQLite (backend), JWT login with email/password or mobile OTP.

## Run it locally

You need **Node.js 20.19 or newer** (22 LTS recommended). Check with `node -v`.

```bash
npm install     # installs root, backend and frontend in one go
npm run dev     # starts the API (port 5000) and the website (port 5173)
```

Open **http://localhost:5173** and click one of the demo buttons (Student, Teacher, Parent).

No setup is needed for local development. The database is created and filled with demo data the first time the backend starts. To change settings, copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`.

### Demo accounts

All use the password `password123`.

| Role    | Email              |
| ------- | ------------------ |
| Student | student@demo.com   |
| Teacher | teacher@demo.com   |
| Parent  | parent@demo.com    |

Classmates `s002@demo.com` to `s007@demo.com` also exist. For mobile OTP login in development, the code is shown on screen and printed in the backend terminal.

### Useful commands

| Command          | What it does                                      |
| ---------------- | ------------------------------------------------- |
| `npm run dev`    | Run backend and frontend together with live reload |
| `npm run seed`   | Wipe the database and reload fresh demo data      |
| `npm run build`  | Build the frontend into `frontend/dist`           |

## Project structure

```
backend/
  server.js            Express app, CORS, routes
  database/db.js       SQLite connection and schema
  database/seed.js     Demo data (runs automatically on an empty database)
  middleware/auth.js   JWT verification and role checks
  routes/              auth, schools, courses, quizzes, attendance, scholarships, users
  uploads/             Teacher-uploaded PDFs and videos
frontend/
  src/pages/           One file per screen
  src/components/      Layout and shared UI pieces
  src/lib/             API client, auth context, types, helpers
  public/_redirects    Makes page refreshes work on Cloudflare Pages
render.yaml            One-click backend deploy on Render
```

## Deploy

The frontend is a static site and the backend is a Node server, so they deploy to two places.

### 1. Backend on Render (free)

1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New → Blueprint**, pick the repo. `render.yaml` sets everything up and generates a `JWT_SECRET`.
3. When it's live, copy the URL (like `https://rural-edu-api.onrender.com`) and open `/api/health` to check it.

Manual setup instead: New → Web Service, root directory `backend`, build `npm install`, start `npm start`, and add `NODE_ENV=production`, `JWT_SECRET` (a long random string) and `CORS_ORIGIN`.

> **Free plan notes:** the service sleeps after 15 idle minutes, so the first visit takes about a minute. The free disk is temporary, so the database resets to demo data on each restart, and uploaded files are lost. That is fine for a portfolio demo. For permanent data, add a Render persistent disk and set `DB_PATH=/var/data/edu.db`, or move to a hosted database.

### 2. Frontend on Cloudflare Pages (free)

1. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
2. Settings:
   - Framework preset: **Vite**
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `VITE_API_URL` = `https://YOUR-RENDER-URL.onrender.com/api`
3. Deploy, then copy your Pages URL (like `https://vidya-setu.pages.dev`).

### 3. Connect them

In Render, set `CORS_ORIGIN` to your Pages URL (no trailing slash). You can list several, comma-separated:

```
CORS_ORIGIN=https://vidya-setu.pages.dev,http://localhost:5173
```

Render redeploys automatically. Your site is now live.

> In production, OTP codes are not shown on screen, since they would normally go out by SMS (Twilio placeholders are in `.env.example`). Email/password and the demo buttons work everywhere.

## API overview

All routes are under `/api`. Everything except auth, school search and health needs an `Authorization: Bearer <token>` header.

| Area         | Main endpoints |
| ------------ | -------------- |
| Auth         | `POST /auth/signup`, `/auth/login`, `/auth/request-otp`, `/auth/verify-otp`, `GET /auth/me` |
| Courses      | `GET /courses/subjects`, `/courses/chapters/:subjectId`, `/courses/content/:chapterId`, `/courses/download/:id`, `POST /courses/upload` (teacher) |
| Quizzes      | `GET /quizzes`, `/quizzes/:id`, `/quizzes/:id/leaderboard`, `/quizzes/:id/results`, `POST /quizzes` (teacher), `/quizzes/:id/submit` (student) |
| Attendance   | `GET /attendance/my`, `/attendance/students`, `/attendance/class`, `/attendance/low-attendance`, `/attendance/child/:id`, `POST /attendance/mark` |
| Scholarships | `GET /scholarships`, `/scholarships/competitions`, `/scholarships/my-applications`, `POST/DELETE /scholarships/:id/apply`, `POST /scholarships` (teacher) |
| Users        | `GET/PATCH /users/me`, `POST /users/change-password`, `GET /users/my-children`, `POST /users/link-child`, `GET /users/:id/performance` |
| Schools      | `GET /schools/search?q=`, `/schools/states` |
