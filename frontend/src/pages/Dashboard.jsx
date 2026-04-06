import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Common Ground</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sign out</button>
      </header>

      <section style={styles.content}>
        <h2>Welcome{user?.full_name ? `, ${user.full_name}` : ""}!</h2>
        <p style={{ color: "#666" }}>Your surveys and teams will appear here.</p>

        <div style={styles.grid}>
          <Tile label="Join a survey" onClick={() => navigate("/survey/join")} />
          <Tile label="Browse teams"  onClick={() => navigate("/teams")} />
          <Tile label="My profile"    onClick={() => navigate("/profile")} />
        </div>
      </section>
    </main>
  );
}

function Tile({ label, onClick }) {
  return (
    <button onClick={onClick} style={styles.tile}>
      {label}
    </button>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f5f5" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.5rem",
    background: "#fff",
    borderBottom: "1px solid #e5e5e5",
  },
  title: { margin: 0, fontSize: "1.3rem" },
  logoutBtn: {
    padding: "0.4rem 0.9rem",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  content: { maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginTop: "1.5rem" },
  tile: {
    padding: "1.5rem 1rem",
    borderRadius: 12,
    border: "1px solid #e0e0e0",
    background: "#fff",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
  },
};
