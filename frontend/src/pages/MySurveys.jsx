import { useState } from "react";
import { Link } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";
import { useAuth } from "../context/AuthContext";


// ── Page ───────────────────────────────────────────────────────────────────────

export default function MySurveys() {

    const { user } = useAuth();

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <h2>
                My Surveys
            </h2>
        </Box>
    );
}