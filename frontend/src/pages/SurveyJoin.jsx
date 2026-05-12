import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import SwitchAccountOutlinedIcon from "@mui/icons-material/SwitchAccountOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";

import { api } from "../api/client";
import { getClient } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useSurvey } from "../context/SurveyContext";

async function fetchSurveyByCode(joinCode) {
  const sb = getClient();
  const { data } = await sb
    .from("surveys")
    .select("id, title, join_code")
    .eq("join_code", joinCode)
    .maybeSingle();
  return data;
}

export default function SurveyJoin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { activeSurvey, setActiveSurvey } = useSurvey();
  const navigate = useNavigate();

  async function handleJoin() {
    setError("");
    if (!code.trim()) {
      setError("Please enter a join code.");
      return;
    }

    setLoading(true);
    try {
      // Attempt to join — ignore "already in survey" so switching works
      try {
        await api.post("/surveys/join", { user_id: user.id, join_code: code });
      } catch (err) {
        if (!err.message?.includes("already in this survey")) throw err;
      }

      // Fetch survey details to store in context
      const survey = await fetchSurveyByCode(code);
      if (!survey) throw new Error("Survey not found.");

      setActiveSurvey({ id: survey.id, title: survey.title, join_code: survey.join_code });
      setCode("");
      navigate("/teams");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isSwitching = !!activeSurvey;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
      <Box
        component="main"
        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", pt: "80px", px: 2 }}
      >
        <Paper variant="outlined" sx={{ width: "100%", maxWidth: 440, p: 5, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} letterSpacing="-0.02em" mb={0.75}>
            {isSwitching ? "Switch survey" : "Join a survey"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ pb: 2 }}>
            {isSwitching
              ? "Enter a new join code to switch which survey you're browsing teams for."
              : "Enter the code shared by your instructor or club leader to join a survey and start finding teammates."}
          </Typography>

          {/* Current active survey */}
          {activeSurvey && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5, p: 1.5, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: "success.main", flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.disabled" display="block">Currently active</Typography>
                <Typography variant="body2" fontWeight={500} noWrap>{activeSurvey.title}</Typography>
              </Box>
              <Chip label={activeSurvey.join_code} size="small" sx={{ fontFamily: "monospace", fontSize: 11 }} />
            </Box>
          )}

          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Collapse>

          <TextField
            fullWidth
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            placeholder="e.g. CS520AAA"
            slotProps={{
              input: {
                sx: { fontFamily: "monospace", fontSize: 18, fontWeight: 500, letterSpacing: "0.15em", textAlign: "center" },
              },
            }}
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleJoin}
            disabled={loading}
            startIcon={isSwitching ? <SwitchAccountOutlinedIcon /> : undefined}
            sx={{ fontWeight: 600 }}
          >
            {isSwitching ? "Switch survey" : "Join survey"}
          </Button>

          {activeSurvey && (
            <Button
              fullWidth
              size="small"
              onClick={() => navigate("/teams")}
              sx={{ mt: 1.5, color: "text.disabled", fontSize: 13 }}
            >
              Back to teams
            </Button>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
