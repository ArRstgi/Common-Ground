from pydantic import BaseModel, EmailStr, Field
import uuid
from typing import Optional
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "member"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str = "member"


# ── Profiles ─────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    school: Optional[str] = None
    major: Optional[str] = None
    grad_year: Optional[int] = None
    bio: Optional[str] = None
    contact_info: Optional[str] = None


# ── Surveys ───────────────────────────────────────────────────────────────────

class AnswerOptionIn(BaseModel):
    option_text: str = Field(..., min_length=1, max_length=500)
    order_index: int = Field(..., ge=0)
 
 
class QuestionIn(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    question_type: str = Field(..., pattern="^(multiple_choice|short_answer)$")
    order_index: int = Field(..., ge=0)
    answer_options: list[AnswerOptionIn] = Field(default_factory=list)
 
 
class SurveyCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = Field(None, max_length=2000)
    deadline: str | None = Field(
        None,
        description="ISO 8601 date string, e.g. '2026-06-01'. Stored as midnight UTC.",
    )
    questions: list[QuestionIn] = Field(..., min_length=1)
 
 
class SurveyCreateResponse(BaseModel):
    id: uuid.UUID
    join_code: str
    created_at: datetime


class SurveyJoinRequest(BaseModel):
    user_id: uuid.UUID
    join_code: str

class SurveyJoinResponse(BaseModel):
    user_id: uuid.UUID
    survey_id: uuid.UUID
    joined_at: datetime


class SurveyGetResponse(BaseModel):
    survey_id: uuid.UUID
    title: str
    description: str
    deadline: datetime | None
    questions: list[SurveyGetQuestion]

class SurveyGetQuestion(BaseModel):
    question_id: uuid.UUID
    prompt: str
    question_type: str = Field(..., pattern="^(multiple_choice|short_answer)$")
    # order_index: str
    answers: list[SurveyGetAnswerChoice] | None
    saved_answer_id: uuid.UUID | None 
    saved_answer_text: str | None 


class SurveyGetAnswerChoice(BaseModel):
    answer_option_id: uuid.UUID
    option_text: str
    # option_index: str


class SurveyPreview(BaseModel):
    survey_id: uuid.UUID
    title: str
    description: str
    deadline: datetime | None


class SurveyAnswersInput(BaseModel):
    answers: dict[str, SurveyAnswerByType]
    survey_id: uuid.UUID
    user_id: uuid.UUID

class SurveyAnswerByType(BaseModel):
    question_type: str = Field(..., pattern="^(multiple_choice|short_answer)$")
    answer_id: uuid.UUID | None
    answer_text: str | None

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
