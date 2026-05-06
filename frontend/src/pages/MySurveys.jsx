import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";

import AddIcon from "@mui/icons-material/Add";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";

import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDeadline(deadlineIso) {
    if (!deadlineIso || deadlineIso === "unset") return null;
    const diff = Math.ceil(
        (new Date(deadlineIso) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return { label: `Expired ${Math.abs(diff)}d ago`, expired: true };
    if (diff === 0) return { label: "Due today", expired: false };
    return { label: `${diff}d left`, expired: false };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SurveyCard({ survey_id, title, description, deadline }) {
    const navigate = useNavigate();
    const dl = formatDeadline(deadline);

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 3,
                borderColor: "grey.200",
                overflow: "hidden",
                transition: "box-shadow 0.2s, border-color 0.2s",
                "&:hover": {
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderColor: "primary.light",
                },
            }}
        >
            <CardActionArea
                onClick={() => navigate(`/surveydetail/${survey_id}`)}
                sx={{ p: 0 }}
            >
                <Box sx={{ display: "flex", alignItems: "stretch" }}>
                    {/* Left accent bar */}
                    <Box
                        sx={{
                            width: 4,
                            flexShrink: 0,
                            bgcolor: "primary.main",
                            opacity: 0.7,
                        }}
                    />

                    {/* Card body */}
                    <Box sx={{ flex: 1, px: 2.5, py: 2.25 }}>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 1,
                                mb: description ? 0.75 : 0,
                            }}
                        >
                            <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                sx={{ lineHeight: 1.3, color: "text.primary" }}
                            >
                                {title}
                            </Typography>

                            {dl && (
                                <Chip
                                    icon={
                                        <CalendarTodayIcon
                                            sx={{ fontSize: "11px !important" }}
                                        />
                                    }
                                    label={dl.label}
                                    size="small"
                                    color={dl.expired ? "error" : "default"}
                                    variant="outlined"
                                    sx={{
                                        fontSize: 11,
                                        height: 22,
                                        flexShrink: 0,
                                        borderColor: dl.expired ? "error.light" : "grey.300",
                                        color: dl.expired ? "error.main" : "text.disabled",
                                    }}
                                />
                            )}
                        </Box>

                        {description && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    lineHeight: 1.55,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {description}
                            </Typography>
                        )}

                        {!dl && (
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ mt: 0.75, display: "block" }}
                            >
                                No deadline
                            </Typography>
                        )}
                    </Box>
                </Box>
            </CardActionArea>
        </Card>
    );
}

function EmptyState() {
    const navigate = useNavigate();
    return (
        <Box
            sx={{
                textAlign: "center",
                py: 8,
                px: 3,
                bgcolor: "white",
                borderRadius: 3,
                border: "1px dashed",
                borderColor: "grey.300",
            }}
        >
            <NoteAltOutlinedIcon sx={{ fontSize: 40, color: "grey.300", mb: 1.5 }} />
            <Typography variant="body1" fontWeight={500} color="text.secondary" mb={0.5}>
                No surveys yet
            </Typography>
            <Typography variant="body2" color="text.disabled" mb={2.5}>
                Join your first survey to get started.
            </Typography>
            <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate("/surveyjoin")}
            >
                Join a survey
            </Button>
        </Box>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MySurveys() {
    const [surveys, setSurveys] = useState([]);
    const [error, setError]     = useState("");

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        async function getSurveys(user_id) {
            try {
                const data = await api.get(`/surveys/surveys_by_user/${user_id}`);
                setSurveys(data);
            } catch (err) {
                setError(err.message || "Failed to load surveys.");
            }
        }
        getSurveys(user.id);
    }, []);

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
            <Box sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, sm: 4 }, pt: 5, pb: 8 }}>

                {/* Page header */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 4,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h5"
                            fontWeight={700}
                            letterSpacing="-0.03em"
                            color="text.primary"
                        >
                            My Surveys
                        </Typography>
                        <Typography variant="body2" color="text.disabled" mt={0.4}>
                            {surveys.length > 0
                                ? `${surveys.length} survey${surveys.length === 1 ? "" : "s"}`
                                : "Surveys you've created"}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => navigate("/surveyjoin")}
                        sx={{ flexShrink: 0 }}
                    >
                        Join New survey
                    </Button>
                </Box>

                {/* Error banner */}
                <Collapse in={!!error}>
                    <Alert
                        severity="error"
                        onClose={() => setError("")}
                        sx={{ mb: 2.5, borderRadius: 2 }}
                    >
                        {error}
                    </Alert>
                </Collapse>

                {/* Survey list or empty state */}
                {surveys.length === 0 && !error ? (
                    <EmptyState />
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {surveys.map((survey) => (
                            <SurveyCard key={survey.survey_id} {...survey} />
                        ))}
                    </Box>
                )}

            </Box>
        </Box>
    );
}