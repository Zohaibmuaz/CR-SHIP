# 🚢 CR-Ship — Class Representative Automation Suite

> **Department of Computer Science • University of Agriculture Faisalabad (UAF)**  
> **Class:** BSCS 7th (E2) • **Class Representative:** Zohaib

---

## ⚡ Overview
**CR-Ship** is a private, offline-first class automation dashboard designed specifically for Class Representative Zohaib. It operates in **Stealth Mode**—the ~130 students interact normally via WhatsApp, while CR-Ship silently automates attendance OCR, timetable change tracking, project group generation, course drive organization, faculty communication, and nightly email backups.

---

## 🚀 Key Features

- **Executive Overview Cockpit:** Real-time clock, today's lecture schedule, active deadlines, and 1-click launchpad.
- **Student Master Roster:** Active directory of all 63 registered students (Ag numbers, names, phone numbers).
- **Visual Timetable & Master Excel Diff:** Weekly grid schedule with university `.xlsx` diff engine for BS(CS)-7th-E2.
- **Attendance OCR & 75% Hazri Engine:** 2-Page attendance photo OCR scanner with automatic exam eligibility calculations and export.
- **Subject-Isolated Group Builder:** Drag & drop project teams, capacity limits, raw text parser, and dual export (Excel + PNG picture).
- **Course Materials & Pinned Drive Hub:** Subject repositories with 1-click auto-organizer for raw WhatsApp links.
- **Faculty Desk & Conduction Tracker:** Teacher directory with 1-click respectful communication templates and daily class conduction logging.
- **CR Task Board & Web Audio Alarms:** Priority tasks, Web Audio synthesizer chimes, HTML5 notifications, and Gmail SMTP alerts.
- **10:00 PM Automated Nightly Email Backup:** Dispatches complete database archive JSON to `zohaibmuaz@gmail.com` every night at 10:00 PM.
- **Permanent Immutable Audit Trail:** 100% searchable SQLite audit log with CSV export.

---

## 🛠️ Database Auto-Seeding (Zero-Config Hosting)

The binary SQLite database file (`cr_nexus.db`) is excluded from Git to prevent merge conflicts and protect privacy. Instead, all class data (63 students, courses, timetable, faculty, materials) is serialized in `prisma/seed_data.json`.

When the project builds or deploys on any host (Vercel, Railway, Render, VPS), it automatically runs:
```bash
prisma generate && prisma db push && node prisma/seed.js && next build
```
This automatically creates the SQLite database and populates all 63 students, timetable slots, faculty, and materials instantly!

---

## 📦 Quick Start / Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Zohaibmuaz/CR-SHIP.git
   cd CR-SHIP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Hosting Instructions

### 1. Vercel
- Import repo from GitHub `Zohaibmuaz/CR-SHIP`.
- Framework Preset: **Next.js**.
- Build Command: `npm run build` (Pre-configured to generate Prisma schema and seed database).
- Add Environment Variable:
  - `NOTIFICATION_EMAIL=zohaibmuaz@gmail.com`
  - (Optional) `SMTP_USER` & `SMTP_PASS` for live Gmail delivery.

### 2. Railway / Render / VPS
- Build Command: `npm run build`
- Start Command: `npm start`
- Persistent Disk: Mount `/app/prisma` if you want uploaded files or new database entries to persist permanently across server restarts.

---

## 🎨 Visual Design Standard
- **Zero Grey Policy:** Crisp pure white text (`#FFFFFF`) in dark mode with luminous ambient glow orbs.
- **4-Color Jewel Palette:** Electric Sapphire (`#6366F1`), Amethyst Purple (`#A855F7`), Mint Emerald (`#10B981`), and Radiant Amber (`#F59E0B`).

---

*Crafted for Class Representative Zohaib • BSCS 7th (E2), UAF*
