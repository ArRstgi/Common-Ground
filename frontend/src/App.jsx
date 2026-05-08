import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import NavigationSidebar, { nav_id_by_path } from "./components/NavigationSidebar";
import Box from "@mui/material/Box";

import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import SurveyJoin   from "./pages/SurveyJoin";
import TeamDetail   from "./pages/TeamDetail";
import TeamBrowser  from "./pages/TeamBrowser";
import SurveyCreate from "./pages/SurveyCreate";
import Profile      from "./pages/Profile";
import SurveyDetail from "./pages/SurveyDetails";
import MySurveys from "./pages/MySurveys";


const ROUTES_WITHOUT_SIDEBAR = [
  "/login", 
  "/register",
];

export default function App() {
  const location = useLocation();
  const showSidebar = !ROUTES_WITHOUT_SIDEBAR.includes(location.pathname);
  const activeId = nav_id_by_path(location.pathname) ?? "dashboard";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {showSidebar && (
          <NavigationSidebar activeId={activeId} />
      )}
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/mysurveys" element={<ProtectedRoute><MySurveys /></ProtectedRoute>} />
          <Route path="/surveyjoin" element={<ProtectedRoute><SurveyJoin /></ProtectedRoute>} />
          <Route path="/surveycreate" element={<ProtectedRoute requiredRole="survey_creator"><SurveyCreate /></ProtectedRoute>} />
          <Route path="/surveydetail/:survey_id" element={<ProtectedRoute><SurveyDetail /></ProtectedRoute>} />


          {/* SHOULD be protected, unprotected for testing  */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/teams" element={<TeamBrowser />} />
          <Route path="/teams/:teamId" element={<TeamDetail />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
