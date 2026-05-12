# Common Ground — Backend API Documentation

**Framework**: FastAPI (Python)  
**Database**: Supabase (PostgreSQL)  
**Authentication**: JWT Bearer tokens via Supabase Auth  
**Interactive docs**: `GET /docs` (Swagger UI) · `GET /redoc` (ReDoc)

---

## Table of Contents

- [Authentication](#authentication)
- [Health](#health)
- [Auth Routes](#auth-routes-auth)
- [Profiles Routes](#profiles-routes-profiles)
- [Surveys Routes](#surveys-routes-surveys)
- [Teams Routes](#teams-routes-teams)
- [Recommendations Routes](#recommendations-routes-recommendations)
- [Search Routes](#search-routes-search)
- [Error Responses](#error-responses)

---

## Authentication

Protected endpoints require an `Authorization` header with a Supabase-issued JWT.

```
Authorization: Bearer <access_token>
```

The token is obtained from `/auth/login` or `/auth/register`. Tokens are verified against Supabase's JWKS endpoint.

---

## Health

### `GET /health`

Returns server health status.

**Auth required**: No

**Response `200`**
```json
{ "status": "ok" }
```

---

## Auth Routes (`/auth`)

### `POST /auth/register`

Create a new user account.

**Auth required**: No

**Request body**
```json
{
  "email": "user@example.com",
  "password": "secret",
  "full_name": "Jane Doe",
  "role": "member"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | Yes | |
| `password` | string | Yes | |
| `full_name` | string | No | |
| `role` | string | No | Default: `"member"` |

**Response `200`**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user_id": "<uuid>",
  "role": "member"
}
```

---

### `POST /auth/login`

Sign in with existing credentials.

**Auth required**: No

**Request body**
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

**Response `200`**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user_id": "<uuid>",
  "role": "member"
}
```

---

## Profiles Routes (`/profiles`)

### `GET /profiles/me`

Get the authenticated user's profile.

**Auth required**: Yes

**Response `200`**
```json
{
  "id": "<uuid>",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "school": "State University",
  "major": "Computer Science",
  "grad_year": 2027,
  "bio": "...",
  "contact_info": "...",
  "role": "member"
}
```

---

### `PATCH /profiles/me`

Update the authenticated user's profile. All fields are optional.

**Auth required**: Yes

**Request body**
```json
{
  "full_name": "Jane Doe",
  "school": "State University",
  "major": "Computer Science",
  "grad_year": 2027,
  "bio": "...",
  "contact_info": "..."
}
```

**Response `200`** — Updated profile object (same shape as `GET /profiles/me`)

---

### `GET /profiles/me/surveys`

Get all surveys the authenticated user has joined, including their submitted responses.

**Auth required**: Yes

**Response `200`**
```json
[
  {
    "survey_id": "<uuid>",
    "title": "Team Formation Survey",
    "joined_at": "2026-05-01T10:00:00Z",
    "submitted": true,
    "responses": [
      { "q": "What is your timezone?", "a": "Pacific" }
    ]
  }
]
```

---

## Surveys Routes (`/surveys`)

### `POST /surveys/create`

Create a new survey with questions.

**Auth required**: Yes  
**Role required**: `survey_creator`

**Request body**
```json
{
  "title": "Team Formation Survey",
  "description": "Help us match you with the right team.",
  "deadline": "2026-06-01",
  "questions": [
    {
      "prompt": "What is your preferred work style?",
      "question_type": "multiple_choice",
      "order_index": 0,
      "answer_options": [
        { "option_text": "Async", "order_index": 0 },
        { "option_text": "Sync", "order_index": 1 }
      ]
    },
    {
      "prompt": "Describe your experience.",
      "question_type": "short_answer",
      "order_index": 1,
      "answer_options": []
    }
  ]
}
```

| Field | Type | Constraints |
|---|---|---|
| `title` | string | 1–300 chars |
| `description` | string \| null | max 2000 chars |
| `deadline` | string \| null | ISO 8601 date (`YYYY-MM-DD`) |
| `questions[].prompt` | string | 1–1000 chars |
| `questions[].question_type` | `"multiple_choice"` \| `"short_answer"` | |
| `questions[].order_index` | integer | ≥ 0 |
| `questions[].answer_options[].option_text` | string | 1–500 chars |
| `questions[].answer_options[].order_index` | integer | ≥ 0 |

**Response `200`**
```json
{
  "id": "<uuid>",
  "join_code": "A1B2C3D4",
  "created_at": "2026-05-11T12:00:00Z"
}
```

---

### `POST /surveys/join`

Join a survey using its join code.

**Auth required**: No

**Request body**
```json
{
  "user_id": "<uuid>",
  "join_code": "A1B2C3D4"
}
```

**Response `200`**
```json
{
  "user_id": "<uuid>",
  "survey_id": "<uuid>",
  "joined_at": "2026-05-11T12:00:00Z"
}
```

---

### `GET /surveys/full_survey_by_id/{survey_id}`

Get a survey with its questions and the current user's saved answers.

**Auth required**: Yes

**Path params**

| Param | Type |
|---|---|
| `survey_id` | UUID |

**Response `200`**
```json
{
  "survey_id": "<uuid>",
  "title": "Team Formation Survey",
  "description": "...",
  "deadline": "2026-06-01T00:00:00Z",
  "questions": [
    {
      "question_id": "<uuid>",
      "prompt": "What is your preferred work style?",
      "question_type": "multiple_choice",
      "answers": [
        { "answer_option_id": "<uuid>", "option_text": "Async" }
      ],
      "saved_answer_id": "<uuid>",
      "saved_answer_text": null
    }
  ]
}
```

For `short_answer` questions, `answers` is `null` and `saved_answer_text` holds the user's response.

---

### `GET /surveys/surveys_by_user/{user_id}`

Get all surveys a user has joined.

**Auth required**: No

**Path params**

| Param | Type |
|---|---|
| `user_id` | UUID |

**Response `200`**
```json
[
  {
    "survey_id": "<uuid>",
    "title": "Team Formation Survey",
    "description": "...",
    "deadline": "2026-06-01T00:00:00Z"
  }
]
```

---

### `POST /surveys/save_answers`

Save (or update) a user's answers for a survey.

**Auth required**: No

**Request body**
```json
{
  "survey_id": "<uuid>",
  "user_id": "<uuid>",
  "answers": {
    "<question_id>": {
      "question_type": "multiple_choice",
      "answer_id": "<uuid>",
      "answer_text": null
    },
    "<question_id>": {
      "question_type": "short_answer",
      "answer_id": null,
      "answer_text": "I prefer async communication."
    }
  }
}
```

For `multiple_choice` questions, provide `answer_id` and set `answer_text` to `null`.  
For `short_answer` questions, provide `answer_text` and set `answer_id` to `null`.

**Response `200`** — Empty body

---

## Teams Routes (`/teams`)

### `POST /teams/{team_id}/merge-requests`

Send a merge request from one team to another (target).

**Auth required**: Yes  
**Authorization**: Caller must be the creator of `requesting_team_id`.

**Path params**

| Param | Type |
|---|---|
| `team_id` | string (target team ID) |

**Request body**
```json
{
  "requesting_team_id": "<team_id>"
}
```

**Response `200`**
```json
{
  "id": "<uuid>",
  "requesting_team_id": "<team_id>",
  "target_team_id": "<team_id>",
  "status": "pending",
  "created_at": "2026-05-11T12:00:00Z"
}
```

---

### `POST /teams/{team_id}/merge-requests/{rid}/approve`

Approve a pending merge request.

**Auth required**: Yes  
**Authorization**: Caller must be the creator of `team_id` (the target team).

**Path params**

| Param | Type |
|---|---|
| `team_id` | string |
| `rid` | string (merge request ID) |

**Response `200`** — `MergeRequestResponse` with `status: "approved"`

---

### `POST /teams/{team_id}/merge-requests/{rid}/reject`

Reject a pending merge request.

**Auth required**: Yes  
**Authorization**: Caller must be the creator of `team_id` (the target team).

**Path params**

| Param | Type |
|---|---|
| `team_id` | string |
| `rid` | string (merge request ID) |

**Response `200`** — `MergeRequestResponse` with `status: "rejected"`

---

## Recommendations Routes (`/recommendations`)

All endpoints require authentication.

### `GET /recommendations/users/{user_id}`

Get a user's profile.

**Path params**: `user_id` (string)

**Response `200`** — Profile object (see [Profiles Routes](#profiles-routes-profiles))

---

### `GET /recommendations/survey/{survey_id}/users/{user_id}`

Get a specific user's answers for a survey.

**Response `200`**
```json
{
  "user_id": "<uuid>",
  "survey_id": "<uuid>",
  "responses": [
    {
      "question_id": "<uuid>",
      "prompt": "What is your preferred work style?",
      "question_type": "multiple_choice",
      "order_index": 0,
      "answer": {
        "answer_option_id": "<uuid>",
        "answer_text": null
      }
    }
  ]
}
```

---

### `GET /recommendations/survey/{survey_id}/responses`

Get all users' answers for a survey.

**Response `200`**
```json
{
  "survey_id": "<uuid>",
  "users": {
    "<user_id>": {
      "<question_id>": {
        "prompt": "...",
        "question_type": "multiple_choice",
        "order_index": 0,
        "answer": { "answer_option_id": "<uuid>", "answer_text": null }
      }
    }
  }
}
```

---

### `GET /recommendations/survey/{survey_id}/teams`

Get all teams for a survey along with their members.

**Response `200`**
```json
{
  "<team_id>": {
    "name": "Team Alpha",
    "description": "...",
    "max_size": 4,
    "members": [
      {
        "user_id": "<uuid>",
        "full_name": "Jane Doe",
        "school": "State University",
        "major": "CS",
        "grad_year": 2027
      }
    ]
  }
}
```

---

### `GET /recommendations/survey/{survey_id}/matches`

Get teams ranked by compatibility score for the authenticated user.

**Response `200`**
```json
[
  {
    "id": "<team_id>",
    "type": "team",
    "name": "Team Alpha",
    "members": [
      { "id": "<uuid>", "name": "Jane Doe", "school": "...", "major": "CS", "gradYear": 2027 }
    ],
    "maxSize": 4,
    "description": "...",
    "matchPct": 87,
    "spotsLeft": 2
  }
]
```

`matchPct` is an integer from 0–100. `type` is `"person"` for individual (unteamed) users or `"team"` for existing teams.

---

## Search Routes (`/search`)

### `GET /search/teams`

Search and filter teams within a survey.

**Auth required**: Yes

**Query parameters**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `survey_id` | string | Yes | — | Filter teams to this survey |
| `name` | string | No | — | Partial name match (case-insensitive) |
| `has_space` | boolean | No | — | `true` = only teams with open spots |
| `sort_by` | `"name"` \| `"spots"` | No | — | |
| `sort_order` | `"asc"` \| `"desc"` | No | — | |
| `filter_question_id` | UUID | No | — | Only teams where members answered this question the same as the current user |
| `page` | integer | No | `1` | |
| `page_size` | integer | No | `20` | Max `100` |

**Response `200`**
```json
{
  "results": [
    {
      "id": "<team_id>",
      "name": "Team Alpha",
      "description": "...",
      "max_size": 4,
      "created_by": "<user_id>",
      "team_members": [
        { "user_id": "<uuid>", "full_name": "Jane Doe" }
      ]
    }
  ],
  "total": 42,
  "page": 1
}
```

Merged teams (`merged_into IS NOT NULL`) are always excluded from results.

---

## Error Responses

All error responses follow a consistent shape:

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Missing or invalid token |
| `403` | Insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate join code, already joined) |
| `422` | Unprocessable entity (Pydantic validation failure) |
| `500` | Internal server error |
