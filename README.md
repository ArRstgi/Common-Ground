# Common Ground

A team-creation system that groups Five College students based on interests — for sports, projects, clubs, and study groups.

## Overview

Common Ground matches students based on shared interests and compatible working styles, not just competency. Survey creators (instructors, coaches, club leaders) define the parameters; students use the results to find teammates they actually want to work with. The system is designed to work across use cases — class projects, club teams, sports practice, and study groups — and supports collaboration across all Five Colleges.

**Stakeholders:**
- **Students** — structured discovery process to find compatible teammates
- **Survey creators** — reduce internal team friction by shaping how groups form
- **Five Colleges** — supports cross-campus courses and projects

## Features

- **Customizable Survey Creation** — administrators define matching parameters such as interests, availability, goals, experience level, and work style
- **Profile Creation** — persistent global profiles (academic background, contact info) plus survey-specific profiles
- **Group Recommendation System** — suggests compatible teams or teammates while preserving individual freedom to choose
- **Search & Filter** — browse and filter groups or teammates by skills, availability, or other preferences

---

## Getting started

### 1. Clone and set up environment variables

```bash
git clone <repo-url>
cd common-ground
```

Copy the example env files and fill in your Supabase credentials:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

You can find your credentials in your Supabase project under **Project Settings → API**.

---

### 2. Start the backend

```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---