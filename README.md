# Vidya Setu: Rural Education Development System

A learning platform for rural schools. Students get NCERT chapters with videos and downloadable notes, timed quizzes, their attendance and scholarships. Teachers upload material, mark attendance and create quizzes. Parents follow their child's attendance and scores.

**Stack:** React 19 + Vite + TypeScript (frontend), Node.js + Express + SQLite (backend), JWT login with email/password or mobile OTP.



### Demo accounts

All use the password `password123`.

| Role    | Email              |
| ------- | ------------------ |
| Student | student@demo.com   |
| Teacher | teacher@demo.com   |
| Parent  | parent@demo.com    |

Classmates `s002@demo.com` to `s007@demo.com` also exist. For mobile OTP login in development, the code is shown on screen and printed in the backend terminal.



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
