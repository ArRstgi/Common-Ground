import { useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import AddIcon from "@mui/icons-material/Add";
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { QuestionCard } from "../components/SurveyQuestionCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const MC_MIN_OPTIONS = 2;
const MC_MAX_OPTIONS = 6;

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ joinCode, onCreateAnother }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "60vh",
                gap: 2,
                textalign: "center",
            }}
        >
            <TaskAltIcon sx={{ fontSize: 56, color: "success.main" }} />
            <Typography variant="h6" fontWeight={600}>
                Survey published!
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Share this join code with participants so they can find and complete your survey.
            </Typography>

            <Paper variant="outlined" sx={{ px: 3, py: 2, borderRadius: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Join code
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                        variant="h5"
                        fontFamily="monospace"
                        fontWeight={700}
                        letterSpacing="0.15em"
                    >
                        {joinCode}
                    </Typography>
                    <Tooltip title={copied ? "Copied!" : "Copy"} placement="top">
                        <IconButton size="small" onClick={handleCopy}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>

            <Button variant="outlined" onClick={onCreateAnother} sx={{ mt: 1 }}>
                Create another survey
            </Button>
        </Box>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function freshForm() {
    return { title: "", desc: "", deadline: "" };
}

function freshQuestion() {
    return { prompt: "", type: "mc", options: ["", ""] };
}

export default function SurveyCreate() {
    // Survey meta
    const [form, setForm] = useState(freshForm());

    // Questions list
    const [questions, setQuestions] = useState([]);

    // New-question panel
    const [addingQ, setAddingQ] = useState(false);
    const [newQ, setNewQ] = useState(freshQuestion());

    // UI state
    const [copied, setCopied] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successCode, setSuccessCode] = useState(null); // non-null → show success screen

    // ── Derived ──────────────────────────────────────────────────────────────

    const canAddOption = newQ.options.length < MC_MAX_OPTIONS;
    const canRemoveOption = newQ.options.length > MC_MIN_OPTIONS;

    // ── Handlers: survey meta ─────────────────────────────────────────────────

    function handleFormChange(field) {
        return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    // ── Handlers: question list ───────────────────────────────────────────────

    function handleDeleteQuestion(id) {
        setQuestions((qs) => qs.filter((q) => q.id !== id));
    }

    // ── Handlers: new-question panel ──────────────────────────────────────────

    function handleQTypeChange(_, val) {
        if (!val) return;
        setNewQ((q) => ({
            ...q,
            type: val,
            options: val === "mc" ? ["", ""] : [],
        }));
    }

    function handleAddOption() {
        if (!canAddOption) return;
        setNewQ((q) => ({ ...q, options: [...q.options, ""] }));
    }

    function handleOptionChange(index, value) {
        setNewQ((q) => ({
            ...q,
            options: q.options.map((o, i) => (i === index ? value : o)),
        }));
    }

    function handleRemoveOption(index) {
        if (!canRemoveOption) return;
        setNewQ((q) => ({ ...q, options: q.options.filter((_, i) => i !== index) }));
    }

    function handleSaveQuestion() {
        if (!newQ.prompt.trim()) return;

        if (newQ.type === "mc") {
            const filled = newQ.options.filter((o) => o.trim());
            if (filled.length < MC_MIN_OPTIONS) return;
        }

        const options =
            newQ.type === "mc" ? newQ.options.filter((o) => o.trim()) : [];

        setQuestions((qs) => [
            ...qs,
            { id: Date.now(), prompt: newQ.prompt.trim(), type: newQ.type, options },
        ]);
        setNewQ(freshQuestion());
        setAddingQ(false);
    }

    function handleCancelAdd() {
        setNewQ(freshQuestion());
        setAddingQ(false);
    }

    // ── Submission ────────────────────────────────────────────────────────────

    async function handleSubmit() {
        setError("");

        if (!form.title.trim()) {
            setError("Please enter a survey title.");
            return;
        }
        if (questions.length === 0) {
            setError("Please add at least one question.");
            return;
        }

        const payload = {
            title: form.title.trim(),
            description: form.desc.trim() || null,
            deadline: form.deadline || null,
            questions: questions.map((q, i) => ({
                prompt: q.prompt,
                question_type: q.type === "mc" ? "multiple_choice" : "short_answer",
                order_index: i,
                answer_options: q.options.map((opt, j) => ({
                    option_text: opt,
                    order_index: j,
                })),
            })),
        };

        try {
            setSubmitting(true);

            const data = await api.post("/surveys/create", payload)
            setSuccessCode(data.join_code);
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    function handleCreateAnother() {
        setForm(freshForm());
        setQuestions([]);
        setNewQ(freshQuestion());
        setAddingQ(false);
        setError("");
        setSuccessCode(null);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (successCode) {
        return (
            <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
                <Box component="main" sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, sm: 4 }, pt: 5, pb: 8 }}>
                    <SuccessScreen
                        joinCode={successCode}
                        onCreateAnother={handleCreateAnother}
                    />
                </Box>
            </Box>
        );
    }

    const { user } = useAuth();

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <Box component="main" sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, sm: 4 }, pt: 5, pb: 8 }}>

                {/* Page header */}
                <Box mb={3.5}>
                    <Typography variant="h6" fontWeight={600} letterSpacing="-0.02em">
                        Create a survey
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Define questions participants will answer to help find matching teammates
                    </Typography>
                </Box>

                {/* Error banner */}
                <Collapse in={!!error}>
                    <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                </Collapse>

                {/* ── Survey details ── */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography
                        variant="caption"
                        fontWeight={600}
                        letterSpacing="0.02em"
                        display="block"
                        mb={2.25}
                    >
                        SURVEY DETAILS
                    </Typography>

                    <TextField
                        label="Title"
                        size="small"
                        fullWidth
                        required
                        value={form.title}
                        onChange={handleFormChange("title")}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label="Description"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        value={form.desc}
                        onChange={handleFormChange("desc")}
                        sx={{ mb: 2 }}
                        slotProps={{ inputLabel: { shrink: true } }}
                        placeholder="Describe what this survey is for (optional)"
                    />

                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                        <Box>
                            <TextField
                                label="Deadline"
                                size="small"
                                type="date"
                                fullWidth
                                value={form.deadline}
                                onChange={handleFormChange("deadline")}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                mt={0.5}
                                display="block"
                            >
                                (Optional)
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* ── Questions ── */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography
                        variant="caption"
                        fontWeight={600}
                        letterSpacing="0.02em"
                        display="block"
                        mb={2.25}
                    >
                        QUESTIONS
                    </Typography>

                    {questions.length === 0 && !addingQ && (
                        <Typography
                            variant="body2"
                            color="text.disabled"
                            textalign="center"
                            py={2}
                        >
                            No questions yet - add one below.
                        </Typography>
                    )}

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 1.5 }}>
                        {questions.map((q, i) => (
                            <QuestionCard
                                key={q.id}
                                question={q}
                                index={i}
                                onDelete={handleDeleteQuestion}
                            />
                        ))}
                    </Box>

                    {/* Add question button */}
                    {!addingQ && (
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setAddingQ(true)}
                            fullWidth
                            variant="outlined"
                            color="inherit"
                            sx={{
                                mt: questions.length > 0 ? 0.5 : 0,
                                borderStyle: "dashed",
                                color: "text.disabled",
                                borderColor: "divider",
                                "&:hover": {
                                    borderColor: "primary.main",
                                    color: "primary.main",
                                    borderStyle: "dashed",
                                },
                            }}
                        >
                            Add a question
                        </Button>
                    )}

                    {/* New-question form */}
                    <Collapse in={addingQ}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                mt: 1.5,
                                borderColor: "primary.main",
                                bgcolor: "primary.50",
                                borderRadius: 2,
                            }}
                        >
                            {/* Type toggle */}
                            <ToggleButtonGroup
                                value={newQ.type}
                                exclusive
                                onChange={handleQTypeChange}
                                size="small"
                                sx={{ mb: 2 }}
                            >
                                <ToggleButton value="mc">Multiple choice</ToggleButton>
                                <ToggleButton value="sa">Short answer</ToggleButton>
                            </ToggleButtonGroup>

                            <TextField
                                label="Question prompt"
                                size="small"
                                fullWidth
                                placeholder="e.g. What is your experience level?"
                                value={newQ.prompt}
                                onChange={(e) =>
                                    setNewQ((q) => ({ ...q, prompt: e.target.value }))
                                }
                                sx={{ mb: 2 }}
                            />

                            {/* Options (MC only) */}
                            <Collapse in={newQ.type === "mc"}>
                                <Typography
                                    variant="caption"
                                    fontWeight={500}
                                    color="text.secondary"
                                    display="block"
                                    mb={1}
                                >
                                    Answer options ({MC_MIN_OPTIONS}–{MC_MAX_OPTIONS})
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1,
                                        mb: 1,
                                    }}
                                >
                                    {newQ.options.map((opt, i) => (
                                        <Box key={i} sx={{ display: "flex", gap: 1 }}>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                placeholder={`Option ${i + 1}`}
                                                value={opt}
                                                onChange={(e) =>
                                                    handleOptionChange(i, e.target.value)
                                                }
                                            />
                                            <Tooltip
                                                title={
                                                    canRemoveOption
                                                        ? "Remove option"
                                                        : `Minimum ${MC_MIN_OPTIONS} options`
                                                }
                                                placement="top"
                                            >
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveOption(i)}
                                                        disabled={!canRemoveOption}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Box>
                                <Tooltip
                                    title={
                                        canAddOption
                                            ? ""
                                            : `Maximum ${MC_MAX_OPTIONS} options`
                                    }
                                    placement="top"
                                >
                                    <span>
                                        <Button
                                            size="small"
                                            onClick={handleAddOption}
                                            startIcon={<AddIcon />}
                                            disabled={!canAddOption}
                                        >
                                            Add option
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Collapse>

                            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    size="small"
                                    onClick={handleCancelAdd}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleSaveQuestion}
                                    disabled={
                                        !newQ.prompt.trim() ||
                                        (newQ.type === "mc" &&
                                            newQ.options.filter((o) => o.trim()).length <
                                                MC_MIN_OPTIONS)
                                    }
                                >
                                    Add question
                                </Button>
                            </Box>
                        </Paper>
                    </Collapse>
                </Paper>

                {/* ── Form actions ── */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, mt: 1 }}>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting}
                        startIcon={
                            submitting ? <CircularProgress size={16} color="inherit" /> : null
                        }
                    >
                        {submitting ? "Publishing…" : "Publish survey"}
                    </Button>
                </Box>

            </Box>
        </Box>
    );
}