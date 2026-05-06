import { useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Collapse from "@mui/material/Collapse";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function SurveyJoin() {
    const [code,    setCode]    = useState("");
    const [error,   setError]   = useState(false);
    const [success, setSuccess] = useState(false);

    function fillCode(c) {
        setCode(c);
        setError(false);
        setSuccess(false);
    }

    async function tryJoin(user_id) {
        setError(false);
        setSuccess(false);

        if (code === "") {
            setError("Please enter a code in the box.")
            return
        }

        const payload = {
            user_id: user_id, 
            join_code: code,
        }
        try {
            const res = await api.post("/surveys/join", payload);
            setSuccess(true);
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setCode("");
        }
    }

    const { user } = useAuth();

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <Box
                component="main"
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: "80px",
                    px: 2,
                }}
            >
                <Paper variant="outlined" sx={{ width: "100%", maxWidth: 440, p: 5, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={600} letterSpacing="-0.02em" mb={0.75}>
                        Join a survey
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
                        Enter the code shared by your instructor or club leader to join a survey and
                        start finding teammates.
                    </Typography>

                    {/* Error banner */}
                    <Collapse in={!!error}>
                        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    </Collapse>
                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            You've joined the survey! 
                        </Alert>
                    )}

                    {/* Code input */}
                    <TextField
                        fullWidth
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CS320ABC"
                        inputprops={{ maxLength: 8 }}
                        slotProps={{
                            input: {
                                sx: {
                                    fontFamily: "monospace",
                                    fontSize: 18,
                                    fontWeight: 500,
                                    letterSpacing: "0.15em",
                                    textAlign: "center",
                                },
                            },
                        }}
                        sx={{ mb: 1.5 }}
                    />
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={() => tryJoin(user.id)}
                        sx={{ fontWeight: 600 }}
                    >
                        Join survey
                    </Button>
                </Paper>
            </Box>
        </Box>
    );
}