import { useState, useEffect } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Collapse from "@mui/material/Collapse";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

// ── Static data ────────────────────────────────────────────────────────────────

const SCHOOLS = [
    "Amherst College",
    "Hampshire College",
    "Mount Holyoke College",
    "Smith College",
    "UMass Amherst",
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SurveyProfileCard({ profile }) {
    const [open, setOpen] = useState(false);

    return (
        <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden", mb: 1.25 }}
        >
            {/* Header */}
            <Box
                onClick={() => setOpen((o) => !o)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1.5,
                    bgcolor: "grey.50",
                    cursor: "pointer",
                    userSelect: "none",
                }}
            >
                <Typography variant="body2" fontWeight={500}>
                    {profile.title}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        bgcolor: profile.submitted ? "success.50" : "grey.200",
                        color: profile.submitted ? "success.main" : "text.secondary",
                        px: 1,
                        py: 0.25,
                        borderRadius: 10,
                        fontFamily: "monospace",
                    }}
                >
                    {profile.submitted ? "Submitted" : "Joined"}
                </Typography>
            </Box>

            {/* Body */}
            <Collapse in={open}>
                <Box
                    sx={{
                        px: 2,
                        py: 1.75,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                    }}
                >
                    {profile.responses.length === 0 ? (
                        <Typography variant="caption" color="text.disabled">
                            No responses submitted yet.
                        </Typography>
                    ) : (
                        profile.responses.map((r) => (
                            <Box
                                key={r.q}
                                sx={{ display: "flex", gap: 1, mb: 0.75 }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    sx={{ minWidth: 160 }}
                                >
                                    {r.q}
                                </Typography>
                                <Typography variant="caption" fontWeight={500}>
                                    {r.a}
                                </Typography>
                            </Box>
                        ))
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name, email) {
    if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : "?";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Profile() {
    const { user } = useAuth();

    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [savedOpen, setSavedOpen] = useState(false);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorMsg, setErrorMsg]   = useState("");
    const [surveys, setSurveys]     = useState([]);

    // Form state
    const [fullName,  setFullName]  = useState("");
    const [email,     setEmail]     = useState("");
    const [school,    setSchool]    = useState("");
    const [major,     setMajor]     = useState("");
    const [gradYear,  setGradYear]  = useState("");
    const [contact,   setContact]   = useState("");
    const [bio,       setBio]       = useState("");

    // Load profile + surveys on mount
    useEffect(() => {
        async function load() {
            try {
                const [profile, surveyData] = await Promise.all([
                    api.get("/profiles/me"),
                    api.get("/profiles/me/surveys"),
                ]);
                setFullName(profile.full_name ?? "");
                setEmail(profile.email ?? user?.email ?? "");
                setSchool(profile.school ?? "");
                setMajor(profile.major ?? "");
                setGradYear(profile.grad_year != null ? String(profile.grad_year) : "");
                setContact(profile.contact_info ?? "");
                setBio(profile.bio ?? "");
                setSurveys(surveyData);
            } catch (err) {
                setErrorMsg(err.message ?? "Failed to load profile");
                setErrorOpen(true);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    async function handleSave() {
        setSaving(true);
        try {
            const payload = {};
            if (fullName)         payload.full_name    = fullName;
            if (school)           payload.school       = school;
            if (major)            payload.major        = major;
            if (gradYear.trim())  payload.grad_year    = parseInt(gradYear, 10);
            if (contact)          payload.contact_info = contact;
            if (bio)              payload.bio          = bio;

            await api.patch("/profiles/me", payload);
            setSavedOpen(true);
        } catch (err) {
            setErrorMsg(err.message ?? "Failed to save");
            setErrorOpen(true);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", bgcolor: "grey.100" }}>
                <CircularProgress />
            </Box>
        );
    }

    const initials = getInitials(fullName, email);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>

            <Box component="main" sx={{ flex: 1, p: "32px 36px", maxWidth: 680 }}>
                <Typography variant="h6" fontWeight={600} letterSpacing="-0.02em" mb={3.5}>
                    Profile
                </Typography>

                {/* Avatar section */}
                <Paper
                    variant="outlined"
                    sx={{ display: "flex", alignItems: "center", gap: 2.5, p: 3, mb: 2, borderRadius: 3 }}
                >
                    <Avatar sx={{ width: 64, height: 64, fontSize: 22, fontWeight: 600, bgcolor: "primary.main" }}>
                        {initials}
                    </Avatar>
                    <Box>
                        <Typography fontWeight={600} fontSize={17}>
                            {fullName || email}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                            {email}
                        </Typography>
                    </Box>
                </Paper>

                {/* General info */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography variant="caption" fontWeight={600} letterSpacing="0.02em" display="block" mb={2.25}>
                        GENERAL INFORMATION
                    </Typography>

                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                        <TextField label="Full name" size="small" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        <TextField
                            label="Email"
                            size="small"
                            value={email}
                            type="email"
                            InputProps={{ readOnly: true }}
                            helperText="Email cannot be changed"
                        />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                        <TextField
                            label="School"
                            size="small"
                            select
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                        >
                            <MenuItem value=""><em>Select school</em></MenuItem>
                            {SCHOOLS.map((s) => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Major" size="small" value={major} onChange={(e) => setMajor(e.target.value)} />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                        <TextField
                            label="Graduation year"
                            size="small"
                            value={gradYear}
                            onChange={(e) => setGradYear(e.target.value)}
                            inputProps={{ inputMode: "numeric" }}
                        />
                        <TextField
                            label="Contact info"
                            size="small"
                            placeholder="Discord handle, phone, etc."
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                        />
                    </Box>
                    <TextField
                        label="Bio"
                        size="small"
                        fullWidth
                        multiline
                        minRows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                    />
                </Paper>

                {/* Survey profiles */}
                {surveys.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                        <Typography variant="caption" fontWeight={600} letterSpacing="0.02em" display="block" mb={2.25}>
                            SURVEY PROFILES
                        </Typography>
                        {surveys.map((s) => (
                            <SurveyProfileCard key={s.survey_id} profile={s} />
                        ))}
                    </Paper>
                )}

                {/* Actions */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, mt: 1 }}>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save changes"}
                    </Button>
                </Box>
            </Box>

            <Snackbar
                open={savedOpen}
                autoHideDuration={2500}
                onClose={() => setSavedOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="success" onClose={() => setSavedOpen(false)}>
                    Changes saved
                </Alert>
            </Snackbar>

            <Snackbar
                open={errorOpen}
                autoHideDuration={4000}
                onClose={() => setErrorOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="error" onClose={() => setErrorOpen(false)}>
                    {errorMsg}
                </Alert>
            </Snackbar>
        </Box>
    );
}