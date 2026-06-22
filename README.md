# Task Assistant

A shared to-do list assistant built with **Next.js** and **Supabase**.

## Features

- Add tasks with title, priority, category, due date, and notes
- Edit or delete tasks
- Mark tasks complete / undo completion
- Filter by status, category, and priority
- Sort by due date, priority, or creation date
- Search tasks
- Focus Today view for urgent and due-today items
- Dashboard with completion stats, overdue count, and category breakdown
- Smart suggestions banner for overdue and high-priority tasks
- Social login via Google and GitHub
- Data stored in Supabase per-user (not shared between accounts)

## Tech stack

- Next.js 14 (static export)
- React 18
- TypeScript
- Supabase (database + auth + API)
- Vercel hosting

## Setup

1. Create a Supabase project at https://supabase.com
2. In the Supabase SQL editor, run the schema from `schema.sql`
3. Enable Google and GitHub providers under **Authentication → Providers**
4. Copy `.env.local.example` to `.env.local` and fill in your credentials
5. Install dependencies:

```bash
npm install
```

6. Run locally:

```bash
npm run dev
```

7. Deploy to Vercel:

```bash
npm run build
npx vercel --prod
```

## Database schema

See `schema.sql` for the `tasks` table and Row Level Security policies.
