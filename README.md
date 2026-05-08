# LLP Monorepo

This repository is now organized as an npm workspaces monorepo.

## Apps

- `apps/web`: React + Vite frontend
- `apps/api`: Express backend for Mistral proxy + LLP endpoints

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Configure backend env:

- Copy `apps/api/.env.example` to `apps/api/.env`
- Add your `MISTRAL_API_KEY`

3. Start PostgreSQL database:

```bash
npm run db:up
```

- Postgres host: `localhost:5432`
- Database: `llp_chat`
- Username: `llp_user`
- Password: `llp_password`

The API will auto-create required tables at startup.

4. Start both apps:

```bash
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`

## Database tables

- `chat_sessions`: one row per chat session
- `chat_messages`: stores user/assistant conversation history

## Build

```bash
npm run build
```
