import { useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Collapse from "@mui/material/Collapse";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import NavigationSidebar from "../components/NavigationSidebar";

// ── Static seed data ───────────────────────────────────────────────────────────

const INITIAL_QUESTIONS = [
    {
        id: 1,
        prompt: "What is your preferred working style?",
        type: "mc",
        options: [
            "Plan ahead and divide early",
            "Flexible, iterative collaboration",
            "Work independently then sync",
        ],
    },
    {
        id: 2,
        prompt: "When are you generally available to meet?",
        type: "mc",
        options: ["Weekday mornings", "Weekday evenings", "Weekend afternoons"],
    },
    {
        id: 3,
        prompt: "Describe your technical background briefly",
        type: "sa",
        options: [],
    },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function QuestionCard({ question, index, onDelete }) {
    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.75,
                    py: 1.5,
                    bgcolor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Typography
                    variant="caption"
                    fontFamily="monospace"
                    sx={{
                        bgcolor: "grey.100",
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        color: "text.disabled",
                    }}
                >
                    Q{index + 1}
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                    {question.prompt}
                </Typography>
                <Typography
                    variant="caption"
                    fontFamily="monospace"
                    sx={{
                        bgcolor: "grey.100",
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        color: "text.disabled",
                    }}
                >
                    {question.type === "mc" ? "multiple choice" : "short answer"}
                </Typography>
                <IconButton size="small" onClick={() => onDelete(question.id)} sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Options */}
            {question.options.length > 0 && (
                <Box sx={{ px: 1.75, py: 1.25, display: "flex", flexWrap: "wrap", gap: 0.75, bgcolor: "grey.50" }}>
                    {question.options.map((opt) => (
                        <Chip key={opt} label={opt} size="small" variant="outlined" />
                    ))}
                </Box>
            )}
        </Paper>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SurveyCreate() {
    const [questions,  setQuestions]  = useState(INITIAL_QUESTIONS);
    const [addingQ,    setAddingQ]    = useState(false);
    const [qType,      setQType]      = useState("mc");
    const [newPrompt,  setNewPrompt]  = useState("");
    const [newOptions, setNewOptions] = useState(["", ""]);
    const [copied,     setCopied]     = useState(false);

    // Form fields
    const [title,    setTitle]    = useState("CS 320 Project Groups");
    const [desc,     setDesc]     = useState("Find teammates for the semester-long software engineering project.");
    const [deadline, setDeadline] = useState("2026-04-20");
    const JOIN_CODE = "CS320ABC";

    function handleDeleteQuestion(id) {
        setQuestions((qs) => qs.filter((q) => q.id !== id));
    }

    function handleAddOption() {
        setNewOptions((opts) => [...opts, ""]);
    }

    function handleOptionChange(index, value) {
        setNewOptions((opts) => opts.map((o, i) => (i === index ? value : o)));
    }

    function handleRemoveOption(index) {
        setNewOptions((opts) => opts.filter((_, i) => i !== index));
    }

    function handleSaveQuestion() {
        if (!newPrompt.trim()) return;
        const options = qType === "mc" ? newOptions.filter(Boolean) : [];
        setQuestions((qs) => [
            ...qs,
            { id: Date.now(), prompt: newPrompt.trim(), type: qType, options },
        ]);
        setNewPrompt("");
        setNewOptions(["", ""]);
        setQType("mc");
        setAddingQ(false);
    }

    function handleCopy() {
        navigator.clipboard.writeText(JOIN_CODE);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <NavigationSidebar activeId="surveys" />

            <Box component="main" sx={{ flex: 1, p: "32px 36px", maxWidth: 740 }}>
                {/* Page header */}
                <Box mb={3.5}>
                    <Typography variant="h6" fontWeight={600} letterSpacing="-0.02em">
                        Create a survey
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Define questions participants will answer to help find matching teammates
                    </Typography>
                </Box>

                {/* Survey details */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography variant="caption" fontWeight={600} letterSpacing="0.02em" display="block" mb={2.25}>
                        SURVEY DETAILS
                    </Typography>

                    <TextField
                        label="Title"
                        size="small"
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Description"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        sx={{ mb: 2 }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />

                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                        <Box>
                            <TextField
                                label="Deadline"
                                size="small"
                                type="date"
                                fullWidth
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                                Unmatched users will be auto-assigned after this date
                            </Typography>
                        </Box>
                        <Box>
                            <TextField
                                label="Join code"
                                size="small"
                                fullWidth
                                value={JOIN_CODE}
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        sx: { fontFamily: "monospace", fontWeight: 500, letterSpacing: "0.1em" },
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Tooltip title={copied ? "Copied!" : "Copy"} placement="top">
                                                    <IconButton size="small" onClick={handleCopy}>
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                                Share this with participants
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* Questions */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography variant="caption" fontWeight={600} letterSpacing="0.02em" display="block" mb={2.25}>
                        QUESTIONS
                    </Typography>

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
                                mt: 0.5,
                                borderStyle: "dashed",
                                color: "text.disabled",
                                borderColor: "divider",
                                "&:hover": { borderColor: "primary.main", color: "primary.main", borderStyle: "dashed" },
                            }}
                        >
                            Add a question
                        </Button>
                    )}

                    {/* New question form */}
                    <Collapse in={addingQ}>
                        <Paper
                            variant="outlined"
                            sx={{ p: 2, mt: 1.5, borderColor: "primary.main", bgcolor: "primary.50", borderRadius: 2 }}
                        >
                            {/* Type toggle */}
                            <ToggleButtonGroup
                                value={qType}
                                exclusive
                                onChange={(_, val) => val && setQType(val)}
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
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            {/* Options (MC only) */}
                            <Collapse in={qType === "mc"}>
                                <Typography variant="caption" fontWeight={500} color="text.secondary" display="block" mb={1}>
                                    Answer options
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1 }}>
                                    {newOptions.map((opt, i) => (
                                        <Box key={i} sx={{ display: "flex", gap: 1 }}>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                placeholder={`Option ${i + 1}`}
                                                value={opt}
                                                onChange={(e) => handleOptionChange(i, e.target.value)}
                                            />
                                            <IconButton size="small" onClick={() => handleRemoveOption(i)}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                                <Button size="small" onClick={handleAddOption} startIcon={<AddIcon />}>
                                    Add option
                                </Button>
                            </Collapse>

                            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                                <Button variant="outlined" color="inherit" size="small" onClick={() => setAddingQ(false)}>
                                    Cancel
                                </Button>
                                <Button variant="contained" size="small" onClick={handleSaveQuestion}>
                                    Add question
                                </Button>
                            </Box>
                        </Paper>
                    </Collapse>
                </Paper>

                {/* Form actions */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, mt: 1 }}>
                    <Button variant="outlined" color="inherit" sx={{ color: "text.secondary" }}>
                        Save draft
                    </Button>
                    <Button variant="contained">
                        Publish survey
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}