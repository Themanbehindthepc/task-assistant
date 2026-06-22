# Task Assistant

A personal to-do list assistant that runs entirely in the browser.

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
- Data persisted in `localStorage`

## Tech stack

- Static HTML, CSS, and vanilla JavaScript
- No build step required
- Ready for a future backend swap via `storage.js`

## Local development

Open `index.html` in any modern browser, or run a simple server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deployment

This project is configured for static hosting on Vercel.
