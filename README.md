<div align="center">

# Daffa · دَفّة

**A thoughtful Arabic-first planner for time, tasks, projects, and connected ideas.**

[![Frontend](https://img.shields.io/badge/HTML%20%2F%20CSS%20%2F%20JavaScript-Vite-316c61?style=flat-square)](https://vite.dev/)
[![Storage](https://img.shields.io/badge/storage-local--first-577d99?style=flat-square)](#your-data)

</div>

Daffa turns intentions into a weekly plan that fits the time you actually have. It is right-to-left, responsive, and designed to work without an account or an application server.

## What you can do

- **Set up subjects and tasks.** Record a due date, priority, expected study time, and the next step.
- **Plan a realistic week.** Generate study blocks around existing appointments, daily limits, study hours, and task deadlines. Tasks that do not fit are reported instead of silently overbooking the day.
- **Track real study time.** Start, pause, resume, and finish a focus timer. Only completed study sessions count toward progress.
- **See the links.** Arrange subjects, tasks, and custom ideas on a dotted canvas, connect them with arrows, and keep those relationships for later.
- **Review progress.** See completed study minutes by day and subject, task completion, and weekly goals.
- **Keep your data.** Changes save to IndexedDB. A local-storage fallback and JSON export/import provide a portable backup.

## Run it

Use Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Create a static production build and preview it locally:

```bash
npm run build
npm run preview
```

The build is written to `dist/`. It includes the cPanel `.htaccess` rules from `public/`. Upload the contents of `dist/` to a static host, GitHub Pages, or a cPanel document root; see the [cPanel upload guide](docs/cpanel-deployment.md). No PHP runtime or database is needed for the current single-device planner. Direct multi-device sync would need a backend and authenticated accounts; this version uses an explicit backup file instead.

## How the planner is organized

```text
src/
  data/planner-store.js   IndexedDB, fallback storage, backup validation
  domain/date.js          local-date and display helpers
  domain/planning.js      deadline and capacity-aware study planning
  ui/primitives.js        shared accessible UI elements
  ui/views.js             dashboard, schedule, tasks, subjects, map, reports
  main.js                 routes, forms, timers, and state updates
  styles.css              design tokens and responsive RTL layouts
```

## Your data

The planner is intentionally local-first: there are no account credentials, analytics calls, or remote API keys in the app. Your browser's storage can still be cleared, so export a backup before changing browsers or devices.

## Design guidance

This repository includes Anthropic's [`frontend-design` skill](.agents/skills/frontend-design/SKILL.md), including its license, and a project-specific token and interaction guide in [`docs/design-system.md`](docs/design-system.md). The interface uses a cool paper-and-ink palette, a measured Arabic type scale, clear priority colors, visible keyboard focus, and reduced-motion support.

## Stack

HTML5 · CSS3 · JavaScript ES modules · Vite · Git

## Skills demonstrated

Semantic HTML, responsive RTL design, accessible interactions, modular JavaScript, IndexedDB persistence, portable JSON backups, and a production-ready Vite build.

The project does not add PHP, Vue/Nuxt, or a remote API because its current product scope does not need a server or framework.

---

<div align="center">Made by <a href="https://github.com/Mo1Amin">Mohamed Amin</a></div>
