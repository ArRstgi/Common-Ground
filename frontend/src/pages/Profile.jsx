import { useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";

import NavigationSidebar from "../components/NavigationSidebar";

// ── Static data ────────────────────────────────────────────────────────────────

const SCHOOLS = [
    "Amherst College",
    "Hampshire College",
    "Mount Holyoke College",
    "Smith College",
    "UMass Amherst",
];

const SURVEY_PROFILES = [
    {
        id: "cs320",
        name: "CS 320 Project Groups",
        status: "Submitted",
        responses: [
            { q: "Working style",  a: "Plan ahead and divide work early" },
            { q: "Availability",   a: "Weekday evenings" },
            { q: "Background",     a: "Comfortable with Python and Java, learning React" },
        ],
    },
    {
        id: "math251",
        name: "Math 251 Study Groups",
        status: "Submitted",
        responses: [
            { q: "Preferred study style", a: "Group sessions with problem sets" },
        ],
    },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SurveyProfileCard({ profile }) {
    const [open, setOpen] = useState(profile.id === "cs320");

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
                    {profile.name}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        bgcolor: "success.50",
                        color: "success.main",
                        px: 1,
                        py: 0.25,
                        borderRadius: 10,
                        fontFamily: "monospace",
                    }}
                >
                    {profile.status}
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
                    {profile.responses.map((r) => (
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
                    ))}
                    <Link href="#" variant="caption" sx={{ display: "block", mt: 1.25 }}>
                        Edit responses →
                    </Link>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Profile() {
    const [savedOpen, setSavedOpen] = useState(false);

    // Form state
    const [fullName,  setFullName]  = useState("Alice Chen");
    const [email,     setEmail]     = useState("alice@amherst.edu");
    const [school,    setSchool]    = useState("Amherst College");
    const [major,     setMajor]     = useState("Computer Science");
    const [gradYear,  setGradYear]  = useState("2026");
    const [contact,   setContact]   = useState("alice#1234");
    const [bio,       setBio]       = useState(
        "Loves hackathons and hiking. Looking for teammates who are motivated and communicative."
    );

    function handleSave() {
        setSavedOpen(true);
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <NavigationSidebar activeId="profile" />

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
                        AC
                    </Avatar>
                    <Box>
                        <Typography fontWeight={600} fontSize={17}>Alice Chen</Typography>
                        <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                            alice@amherst.edu
                        </Typography>
                        <Typography
                            variant="caption"
                            color="primary"
                            sx={{ display: "block", mt: 0.75, cursor: "pointer" }}
                        >
                            Change photo
                        </Typography>
                    </Box>
                </Paper>

                {/* General info */}
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography variant="caption" fontWeight={600} letterSpacing="0.02em" display="block" mb={2.25}>
                        GENERAL INFORMATION
                    </Typography>

                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                        <TextField label="Full name"  size="small" value={fullName}  onChange={(e) => setFullName(e.target.value)} />
                        <TextField label="Email"      size="small" value={email}     onChange={(e) => setEmail(e.target.value)} type="email" />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                        <TextField
                            label="School"
                            size="small"
                            select
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                        >
                            {SCHOOLS.map((s) => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Major" size="small" value={major} onChange={(e) => setMajor(e.target.value)} />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                        <TextField label="Graduation year"  size="small" value={gradYear} onChange={(e) => setGradYear(e.target.value)} />
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
                <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
                    <Typography variant="caption" fontWeight={600} letterSpacing="0.02em" display="block" mb={2.25}>
                        SURVEY PROFILES
                    </Typography>
                    {SURVEY_PROFILES.map((p) => (
                        <SurveyProfileCard key={p.id} profile={p} />
                    ))}
                </Paper>

                {/* Actions */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, mt: 1 }}>
                    <Button variant="outlined" color="inherit" sx={{ color: "text.secondary" }}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleSave}>
                        Save changes
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
        </Box>
    );
}