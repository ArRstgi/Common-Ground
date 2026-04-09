import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import SurveyJoin   from "./pages/SurveyJoin";
import TeamDetail   from "./pages/TeamDetail";
import TeamBrowser  from "./pages/TeamBrowser";
import SurveyCreate from "./pages/SurveyCreate";
import Profile from "./pages/Profile";

// SurveyDetail — stub until Contributor B implements it
function SurveyDetail() {
  return (
    <main style={{ padding: "3rem 2rem", textAlign: "center", color: "#555" }}>
      <h2>Survey detail</h2>
      <p style={{ fontSize: "0.9rem" }}>Contributor B will implement this page.</p>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
