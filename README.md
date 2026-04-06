# Common Ground

A team-creation system that groups Five College students based on interests — for sports, projects, clubs, and study groups.

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