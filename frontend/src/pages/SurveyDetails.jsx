import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CircleIcon from "@mui/icons-material/Circle";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable deadline string, or null if no deadline.
 *   - Negative  → "Expired X days ago"
 *   - Zero      → "Due today"
 *   - Positive  → "X days left"
 */
function formatDeadline(deadlineIso) {
    if (!deadlineIso) return null;
    const diff = Math.ceil(
        (new Date(deadlineIso) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return `Expired ${Math.abs(diff)} days ago`;
    if (diff === 0) return "Due today";
    return `${diff} day${diff === 1 ? "" : "s"} left`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MultipleChoiceQuestion({ question, selected, onSelect }) {
    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography
                variant="caption"
                fontFamily="monospace"
                color="text.disabled"
                letterSpacing="0.06em"
                display="block"
                sx={{ textTransform: "uppercase", mb: 1 }}
            >
                Question {question.index}
            </Typography>
            <Typography fontWeight={500} fontSize={15} sx={{ lineHeight: 1.4, mb: 2.25 }}>
                {question.prompt}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {question.answers.map((opt) => {
                    const isSelected = selected === opt.answer_option_id;
                    return (
                        <Box
                            key={opt.answer_option_id}
                            onClick={() =>
                                onSelect(
                                    question.question_id,
                                    isSelected ? null : opt.answer_option_id
                                )
                            }
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                px: 2,
                                py: 1.5,
                                border: "1.5px solid",
                                borderColor: isSelected ? "primary.main" : "divider",
                                borderRadius: 2,
                                bgcolor: isSelected ? "primary.50" : "grey.50",
                                color: isSelected ? "primary.main" : "text.secondary",
                                cursor: "pointer",
                                fontWeight: isSelected ? 500 : 400,
                                fontSize: 14,
                                transition: "all 0.15s",
                                "&:hover": {
                                    borderColor: "primary.main",
                                    bgcolor: "primary.50",
                                    color: "primary.main",
                                },
                            }}
                        >
                            <Radio
                                checked={isSelected}
                                size="small"
                                sx={{ p: 0, color: "inherit" }}
                                disableRipple
                            />
                            {opt.option_text}
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}

function ShortAnswerQuestion({ question, value, onChange }) {
    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography
                variant="caption"
                fontFamily="monospace"
                color="text.disabled"
                letterSpacing="0.06em"
                display="block"
                sx={{ textTransform: "uppercase", mb: 1 }}
            >
                Question {question.index}
            </Typography>
            <Typography fontWeight={500} fontSize={15} sx={{ lineHeight: 1.4, mb: 2.25 }}>
                {question.prompt}
            </Typography>
            <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                placeholder="Type your answer here..."
                value={value}
                onChange={(e) => onChange(question.question_id, e.target.value)}
                sx={{ bgcolor: "grey.50" }}
            />
        </Paper>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SurveyDetail() {
    const { survey_id } = useParams();

    const [survey, setSurvey]       = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState("");
    const [submitted, setSubmitted] = useState(false);

    // Unified answers map: { [question_id]: answer_option_id | string }
    const [answers, setAnswers] = useState({});

    const { user } = useAuth();

    // ── Data fetching ─────────────────────────────────────────────────────────

    useEffect(() => {
        async function fetchSurvey() {
            try {
                const data = await api.get(`/surveys/full_survey_by_id/${survey_id}`);
                setSurvey(data);
            } catch (err) {
                setError(err.message || "Something went wrong. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        fetchSurvey();
    }, [survey_id]);

    // ── Answer handlers ───────────────────────────────────────────────────────

    function handleSelectOption(questionId, answerOptionId) {
        setAnswers((prev) => ({ ...prev, [questionId]: answerOptionId }));
    }

    function handleTextChange(questionId, value) {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    }

    // ── Progress ──────────────────────────────────────────────────────────────

    const questions = survey?.questions ?? [];

    const numAnswered = questions.filter((q) => {
        const val = answers[q.question_id];
        if (q.question_type === "multiple_choice") return !!val;
        return typeof val === "string" && val.trim().length > 0;
    }).length;

    const total = questions.length;
    const progressPct = total > 0 ? Math.round((numAnswered / total) * 100) : 0;

    // ── Submit ────────────────────────────────────────────────────────────────

    function handleSubmit() {
        const payload = {
            survey_id: survey_id,
            user_id: user.id,
            answers: Object.fromEntries(
                questions.map((q) => [
                    q.question_id,
                    {
                        question_type: q.question_type,
                        answer_id: q.question_type === "multiple_choice"
                            ? (answers[q.question_id] ?? null)
                            : null,
                        answer_text: q.question_type === "short_answer"
                            ? (answers[q.question_id] ?? null)
                            : null,
                    },
                ])
            ),
        };

        try {
            api.post("/surveys/save_answers", payload);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setError(e.message || "Failed to save answers. Please try again.");
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const deadlineLabel = survey ? formatDeadline(survey.deadline) : null;

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <Box component="main" sx={{ flex: 1, p: "32px 36px", maxWidth: 680 }}>

                {/* Back link */}
                <Box
                    component={Link}
                    to="/mysurveys"
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        fontSize: 13,
                        color: "text.disabled",
                        textDecoration: "none",
                        mb: 2.5,
                        "&:hover": { color: "text.secondary" },
                    }}
                >
                    <ArrowBackIcon sx={{ fontSize: 14 }} />
                    My surveys
                </Box>

                {/* Error banner */}
                <Collapse in={!!error}>
                    <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                </Collapse>

                {/* Success banner */}
                <Collapse in={submitted}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Your responses have been saved. You can now browse teams for this survey.
                    </Alert>
                </Collapse>

                {loading && (
                    <LinearProgress sx={{ borderRadius: 2, mb: 2 }} />
                )}

                {survey && (
                    <>
                        {/* Survey header */}
                        <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                            <Typography
                                variant="h6"
                                fontWeight={600}
                                letterSpacing="-0.02em"
                                mb={0.75}
                            >
                                {survey.title}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ lineHeight: 1.5, mb: 2 }}
                            >
                                {survey.description}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                                {deadlineLabel && (
                                    <Chip
                                        icon={
                                            <CircleIcon
                                                sx={{
                                                    fontSize: "8px !important",
                                                    color: deadlineLabel.startsWith("Expired")
                                                        ? "error.main !important"
                                                        : "success.main !important",
                                                }}
                                            />
                                        }
                                        label={deadlineLabel}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Paper>

                        {/* Progress */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                            <LinearProgress
                                variant="determinate"
                                value={progressPct}
                                sx={{ flex: 1, height: 5, borderRadius: 2, 
                                    '& .MuiLinearProgress-bar': {
                                    transition: 'none',
                                    }, 
                                }}
                            />
                            <Typography
                                variant="caption"
                                fontFamily="monospace"
                                color="text.disabled"
                                sx={{ whiteSpace: "nowrap" }}
                            >
                                {numAnswered} / {total} answered
                            </Typography>
                        </Box>

                        {/* Questions */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                            {questions.map((q, i) => {
                                const qWithIndex = { ...q, index: i + 1 };
                                if (q.question_type === "multiple_choice") {
                                    return (
                                        <MultipleChoiceQuestion
                                            key={q.question_id}
                                            question={qWithIndex}
                                            selected={answers[q.question_id] ?? null}
                                            onSelect={handleSelectOption}
                                        />
                                    );
                                }
                                return (
                                    <ShortAnswerQuestion
                                        key={q.question_id}
                                        question={qWithIndex}
                                        value={answers[q.question_id] ?? ""}
                                        onChange={handleTextChange}
                                    />
                                );
                            })}
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                            <Button variant="contained" onClick={handleSubmit}>
                                Save Responses
                            </Button>
                        </Box>
                    </>
                )}

            </Box>
        </Box>
    );
}