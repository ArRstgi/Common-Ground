from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router
from routers.recommendations import router as recommendations_router
from routers.teams import router as teams_router
from routers.surveys import router as surveys_router
from routers.search import router as search_router

app = FastAPI(
    title="Common Ground API",
    description="Team-creation system for Five College students.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(recommendations_router)
app.include_router(teams_router)
app.include_router(surveys_router)
app.include_router(search_router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
