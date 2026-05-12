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

### 4. Run the tests

Tests are located in `backend/tests/`. No live database is required — all Supabase calls are mocked.

Run the full test suite:

```bash
cd backend
uv run pytest tests/ --cov=routers/ --cov-report=term-missing -v
```

Run a specific test file:

```bash
uv run pytest tests/test_merge_requests.py --cov=routers.teams --cov-report=term-missing -v
uv run pytest tests/test_recommendations.py --cov=routers.recommendations --cov-report=term-missing -v
uv run pytest tests/test_search_teams.py --cov=routers.search --cov-report=term-missing -v
uv run pytest tests/test_surveys.py --cov=routers.surveys --cov-report=term-missing -v
uv run pytest tests/test_profiles.py --cov=routers.profiles --cov-report=term-missing -v
```

**Test coverage:**
- `test_merge_requests.py` — merge request creation, approval, and rejection
- `test_recommendations.py` — recommendation endpoints and compatibility scoring logic
- `test_search_teams.py` — team search filtering, sorting, and question answer filter
- `test_surveys.py` - survey creation, joining, retrieval, and submission
- `test_profiles.py` — profile retrieval, profile updates, and survey response listing

## Using Supabase Locally

1. Make sure to `npm install` in frontend and `uv sync` in backend.

2. Run `npx supabase status` and pay attention to the Authentication Keys section.

3. Add an .env.local file to `backend` folder.
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<Publishable Key from supabase status>
SUPABASE_SECRET_KEY=<Secret Key from supabase status>
```

4. Add an .env.local file to `frontend` folder.
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<Publishable Key from supabase status>
```

5. Start the local Supabase instance: `npx supabase start`

6. Reset the database: `npx supabase db reset`

---
