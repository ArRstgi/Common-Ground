import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MuiLink from "@mui/material/Link";
import Person2OutlinedIcon from "@mui/icons-material/Person2Outlined";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, fullName, role);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "grey.100",
      }}
    >
      <Paper elevation={2} sx={{ width: "100%", maxWidth: 420, p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Common Ground
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Create your account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Role selector */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500} mb={0.75} display="block">
              I am a…
            </Typography>
            <ToggleButtonGroup
              value={role}
              exclusive
              onChange={(_, val) => { if (val) setRole(val); }}
              fullWidth
              size="small"
              sx={{ '& .MuiToggleButton-root': { fontSize: 13, gap: 0.75, textTransform: 'none', py: 1 } }}
            >
              <ToggleButton value="member">
                <Person2OutlinedIcon fontSize="small" />
                Student / Member
              </ToggleButton>
              <ToggleButton value="survey_creator">
                <AddCircleOutlinedIcon fontSize="small" />
                Survey Creator
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.disabled" mt={0.75} display="block">
              {role === "survey_creator"
                ? "You can create surveys and manage team formation."
                : "You can join surveys, respond, and form teams."}
            </Typography>
          </Box>

          <TextField
            label="Full name"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            fullWidth
            size="small"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            inputProps={{ minLength: 6 }}
            fullWidth
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{ my: 0.5, py: 1, fontWeight: 600 }}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" textAlign="center" mt={2.5}>
          Already have an account?{" "}
          <MuiLink component={Link} to="/login">
            Sign in
          </MuiLink>
        </Typography>
      </Paper>
    </Box>
  );
}
