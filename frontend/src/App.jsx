import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import NavigationSidebar, { NAV_ID_BY_PATH } from "./components/NavigationSidebar";
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


const ROUTES_WITHOUT_SIDEBAR = [
  "/login", 
  "/register",
];

export default function App() {
  const location = useLocation();
  const showSidebar = !ROUTES_WITHOUT_SIDEBAR.includes(location.pathname);
  const activeId = NAV_ID_BY_PATH[location.pathname] ?? "dashboard";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {showSidebar && (
          <NavigationSidebar activeId={activeId} />
      )}
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* SHOULD be protected, unprotected for testing  */}
          <Route path="/surveyjoin" element={<SurveyJoin />} />
          <Route path="/surveycreate" element={<SurveyCreate />} />
          <Route path="/surveydetail" element={<SurveyDetail />} />
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
