import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CircleIcon from "@mui/icons-material/Circle";
import { api } from "../api/client";
import Collapse from "@mui/material/Collapse";

// ── Static survey data ─────────────────────────────────────────────────────────

const SURVEY = {
    title: "CS 320 Project Groups",
    description: "Find teammates for the semester-long software engineering project.",
    status: "Active · 14 days left",
    participants: 24,
    code: "CS320ABC",
};

const QUESTIONS = [
    {
        id: "q1",
        type: "mc",
        prompt: "What is your preferred working style?",
        options: [
            "Plan ahead and divide work early",
            "Flexible, iterative collaboration",
            "Work independently then sync up",
        ],
    },
    {
        id: "q2",
        type: "mc",
        prompt: "When are you generally available to meet?",
        options: ["Weekday mornings", "Weekday evenings", "Weekend afternoons"],
    },
    {
        id: "q3",
        type: "sa",
        prompt: "Describe your technical background briefly.",
    },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function MultChoiceQuestion({ question, selected, onSelect }) {
    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography
                variant="caption"
                fontFamily="monospace"
                color="text.disabled"
                letterSpacing="0.06em"
                display="block"
                sx={{
                    textTransform:"uppercase",
                    mb:1
                }}
            >
                Question {question.index}
            </Typography>
            <Typography fontWeight={500} fontSize={15} sx={{lineHeight:1.4, mb:2.25}}>
                {question.prompt}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {question.options.map((opt) => {
                    const isSelected = selected === opt;
                    return (
                        <Box
                            key={opt}
                            onClick={() => onSelect(question.id, isSelected ? null : opt)}
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
                            {opt}
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}

function ShortAnsQuestion({ question, value, onChange }) {
    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography
                variant="caption"
                fontFamily="monospace"
                color="text.disabled"
                sx={{
                    textTransform:"uppercase"
                }}
                letterSpacing="0.06em"
                display="block"
                mb={1}
            >
                Question {question.index}
            </Typography>
            <Typography fontWeight={500} fontSize={15} sx={{lineHeight:1.4, mb:2.25}}>
                {question.prompt}
            </Typography>
            <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                placeholder="e.g. Comfortable with Python and Java, currently learning React..."
                value={value}
                onChange={(e) => onChange(question.id, e.target.value)}
                sx={{ bgcolor: "grey.50" }}
            />
        </Paper>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SurveyDetail() {
    const { survey_id } = useParams();
    const [error, setError] = useState("");
    const [mcAnswers, setMcAnswers] = useState({ q1: "Plan ahead and divide work early" });
    const [saAnswers, setSaAnswers] = useState({ q3: "" });
    const [submitted, setSubmitted] = useState(false);

    function setData(data) {
        
    }

    function handleSelectOption(qId, value) {
        setMcAnswers((prev) => ({ ...prev, [qId]: value }));
    }

    function handleSAChange(qId, value) {
        setSaAnswers((prev) => ({ ...prev, [qId]: value }));
    }

    // Progress logic (mirrors original)
    const answered = QUESTIONS.filter((q) => {
        if (q.type === "mc") return !!mcAnswers[q.id];
        return (saAnswers[q.id] || "").trim().length > 0;
    }).length;
    const total = QUESTIONS.length;
    const progressPct = Math.round((answered / total) * 100);

    function handleSubmit() {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    
    useEffect(() => {
        async function getSurveyDetails(survey_id) {
            try {
                const data = await api.get(`/surveys/full_survey_by_id/${survey_id}`);
                setData(data);
            } catch (err) {
                setError(err.message || "Something went wrong. Please try again.");
            }
        }

        getSurveyDetails(survey_id);
    }, [])

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

                {/* Survey header */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={600} letterSpacing="-0.02em" mb={0.75}>
                        {SURVEY.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight:1.5, mb:2 }}>
                        {SURVEY.description}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                        <Chip
                            icon={<CircleIcon sx={{ fontSize: "8px !important", color: "success.main !important" }} />}
                            label={SURVEY.status}
                            size="small"
                            variant="outlined"
                        />
                        <Chip label={`${SURVEY.participants} participants`} size="small" variant="outlined" />
                        <Chip
                            label={
                                <span>
                                    Code:{" "}
                                    <strong style={{ fontFamily: "monospace" }}>{SURVEY.code}</strong>
                                </span>
                            }
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                </Paper>

                {/* Success banner */}
                {submitted && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Your responses have been saved. You can now browse teams for this survey.
                    </Alert>
                )}

                {/* Progress */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progressPct}
                        sx={{ flex: 1, height: 5, borderRadius: 2 }}
                    />
                    <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{whiteSpace:"nowrap"}}>
                        {answered} / {total} answered
                    </Typography>
                </Box>

                {/* Questions */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                    {QUESTIONS.map((q, i) => {
                        const qWithIndex = { ...q, index: i + 1 };
                        if (q.type === "mc") {
                            return (
                                <MultChoiceQuestion
                                    key={q.id}
                                    question={qWithIndex}
                                    selected={mcAnswers[q.id] ?? null}
                                    onSelect={handleSelectOption}
                                />
                            );
                        }
                        return (
                            <ShortAnsQuestion
                                key={q.id}
                                question={qWithIndex}
                                value={saAnswers[q.id] ?? ""}
                                onChange={handleSAChange}
                            />
                        );
                    })}
                </Box>

                {/* Actions */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
                    <Button variant="outlined" color="inherit" sx={{ color: "text.secondary" }}>
                        Save draft
                    </Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        Submit responses
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}