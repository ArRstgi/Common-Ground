import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
import { api } from "../api/client";
import { Stack } from "@mui/system";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";

function SurveyCard({ survey_id, title, description, deadline }) { 

    const navigate = useNavigate();
    deadline = deadline || "unset"
    return (
        <Card variant="outlined">
            <CardActionArea onClick={() => { navigate(`/surveydetail/${survey_id}`); }}>
                <CardContent>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }} gap={1}>
                        <Typography variant="subtitle1" fontWeight={500}>
                            {title}
                        </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" mt={1}>
                        {description}
                    </Typography>

                    <Stack direction="row" sx={{alignItems: "center"}} gap={0.5} mt={1.5}>
                        <Typography variant="caption" color="text.disabled">
                            Deadline: { deadline }
                        </Typography>
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MySurveys() {

    const [surveys, setSurveys] = useState([]);

    const { user } = useAuth();

    useEffect(() => {
        async function getSurveys(user_id) {
            // looks like list of { survey_id, title, description, deadline }
            const data = await api.get(`/surveys/surveys_by_user/${user_id}`);
            setSurveys(data)
        }
        getSurveys(user.id);
    }, [])

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "grey.100" }}>
            <h2>
                My Surveys
            </h2>
            <Stack spacing={1.5}>
                { surveys.map(survey => (
                    <SurveyCard key={survey.survey_id} {...survey} />
                ))}
            </Stack>
        </Box>
    );
}