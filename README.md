# Backend — NestJS + Prisma + PostgreSQL

## What's built so far
- `auth` — register/login (email or phone), JWT access + refresh tokens, hook for social login
- `users` — profile, reputation points, category expertise, leaderboard, admin suspend/ban/verify
- `categories` — CRUD (admin-only writes)
- `posts` — create problem/solution posts with attachments, feed, search, like, favorite, mark solved, trending flag
- `comments` — threaded comments, likes, delete
- `rewards` — post author rewards a contributor → grants points + reputation in that category
- `agent-client` — calls the separate `agent-ai` (Google ADK) service when a PROBLEM post is created, stores the result as `AIAnalysis` + posts it as a comment from a system "AI Agent" account

## Not yet built (next steps)
- `chat` — real-time messaging (Socket.io gateway) + friend requests
- `notifications` — comment/message/solved/reward alerts
- `reports` — flagging posts/comments/messages/users, admin review queue
- `search` — currently a basic Postgres `contains` query inside `posts.service`; will likely move to its own module once we add full-text or vector search

## Setup
```bash
cp .env.example .env   # fill in DATABASE_URL etc.
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

API is served under `/api` (e.g. `POST /api/auth/register`).

## Notes
- The AI analysis call in `agent-client.service.ts` is currently awaited inline for simplicity. In production, move it onto a queue (BullMQ + Redis, or GCP Pub/Sub since the agent is on Google ADK) so post creation doesn't wait on the AI round trip.
- `Like` and `Favorite` are unique per `(userId, postId)` / `(userId, commentId)` to make toggling idempotent.
