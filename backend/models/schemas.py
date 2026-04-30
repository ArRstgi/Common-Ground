from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


# ── Profiles ─────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    school: Optional[str] = None
    major: Optional[str] = None
    grad_year: Optional[int] = None
    bio: Optional[str] = None
    contact_info: Optional[str] = None


# ── Surveys ───────────────────────────────────────────────────────────────────

class AnswerOptionCreate(BaseModel):
    option_text: str
    order_index: int = 0


class QuestionCreate(BaseModel):
    prompt: str
    question_type: str  # "multiple_choice" | "short_answer"
    order_index: int = 0
    answer_options: list[AnswerOptionCreate] = []


class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    questions: list[QuestionCreate] = []


class SurveyJoinByCode(BaseModel):
    join_code: str


class SurveyResponse(BaseModel):
    question_id: str
    answer_option_id: Optional[str] = None
    answer_text: Optional[str] = None


class SurveySubmit(BaseModel):
    responses: list[SurveyResponse]


# ── Teams ─────────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_size: int = 4


class TeamMemberUpdate(BaseModel):
    status: str  # "approved" | "rejected"


# ── Merge Requests ────────────────────────────────────────────────────────────

class MergeRequestCreate(BaseModel):
    requesting_team_id: str


class MergeRequestResponse(BaseModel):
    id: str
    requesting_team_id: str
    target_team_id: str
    status: str
    created_at: datetime
