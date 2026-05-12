import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import Chip from "@mui/material/Chip";

export function QuestionCard({ question, index, onDelete }) {
    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.75,
                    py: 1.5,
                    bgcolor: "background.paper",
                    borderBottom: question.options.length > 0 ? "1px solid" : "none",
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
                        flexShrink: 0,
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
                        flexShrink: 0,
                    }}
                >
                    {question.type === "mc" ? "multiple choice" : "short answer"}
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => onDelete(question.id)}
                    sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {question.options.length > 0 && (
                <Box
                    sx={{
                        px: 1.75,
                        py: 1.25,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.75,
                        bgcolor: "grey.50",
                    }}
                >
                    {question.options.map((opt, i) => (
                        <Chip key={i} label={opt} size="small" variant="outlined" />
                    ))}
                </Box>
            )}
        </Paper>
    );
}