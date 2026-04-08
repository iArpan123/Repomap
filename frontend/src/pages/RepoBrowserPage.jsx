import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GitBranch, Star, GitFork, LogOut, Map, Search, ExternalLink, Lock } from "lucide-react";

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
  Java: "#b07219", Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516",
  "C++": "#f34b7d", C: "#555555", "C#": "#178600", PHP: "#4F5D95",
  Swift: "#F05138", Kotlin: "#A97BFF", Vue: "#41b883", Dart: "#00B4AB",
};

export default function RepoBrowserPage() {
  const { token, user, loading: authLoading, login, logout } = useAuth();
  const [repos, setRepos]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError]       = useState("");
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();

  // Pick up token from OAuth callback redirect (?token=xxx)
  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      login(t);
      // Clean token from URL without causing a reload
      window.history.replaceState({}, "", "/repos");
    }
  }, []);

  // Redirect to home if not logged in after auth check
  useEffect(() => {
    if (!authLoading && !token) navigate("/");
  }, [authLoading, token]);

  // Fetch repos once user is confirmed
  useEffect(() => {
    if (!token) return;
    setLoadingRepos(true);
    fetch("/api/auth/repos", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => { setRepos(data); setFiltered(data); })
      .catch(() => setError("Failed to load repositories."))
      .finally(() => setLoadingRepos(false));
  }, [token]);

  // Filter on search
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      repos.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.language || "").toLowerCase().includes(q)
      )
    );
  }, [search, repos]);

  function handleRepoClick(repo) {
    navigate(`/repo/${repo.owner}/${repo.name}`);
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  if (authLoading) return <FullScreenSpinner text="Authenticating…" />;

  return (
    <div style={{ minHeight: "100vh", background: "#090d13", color: "#e2e8f0" }}>

      {/* Navbar */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px", borderBottom: "1px solid #1e293b",
        background: "#0d1117",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          onClick={() => navigate("/")}>
          <Map size={20} color="#38bdf8" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>RepoMap</span>
        </div>

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={user.avatar_url} alt={user.login}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #1e293b" }} />
            <span style={{ fontSize: 13, color: "#94a3b8" }}>@{user.login}</span>
            <button onClick={() => { logout(); navigate("/"); }} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: "1px solid #334155",
              borderRadius: 6, padding: "5px 10px", color: "#94a3b8",
              cursor: "pointer", fontSize: 12,
            }}>
              <LogOut size={12} /> Sign out
            </button>
            <a href="https://github.com/logout" target="_blank" rel="noreferrer"
              onClick={() => logout()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "transparent", border: "1px solid #334155",
                borderRadius: 6, padding: "5px 10px", color: "#94a3b8",
                cursor: "pointer", fontSize: 12, textDecoration: "none",
              }}>
              <LogOut size={12} /> Switch account
            </a>
          </div>
        )}
      </nav>

      {/* Header */}
      <div style={{ padding: "36px 28px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Your Repositories
        </h2>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
          {repos.length} public repos — click any to generate its architecture diagram
        </p>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 380 }}>
          <Search size={14} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "#475569",
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repos…"
            style={{
              width: "100%", background: "#0d1117", border: "1px solid #1e293b",
              borderRadius: 8, padding: "9px 12px 9px 34px", color: "#e2e8f0",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Repo Grid */}
      <div style={{ padding: "0 28px 48px", maxWidth: 1100, margin: "0 auto" }}>
        {loadingRepos && <FullScreenSpinner text="Loading repositories…" />}
        {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

        {!loadingRepos && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}>
            {filtered.map(repo => (
              <div
                key={repo.full_name}
                onClick={() => handleRepoClick(repo)}
                style={{
                  background: "#0d1117", border: "1px solid #1e293b",
                  borderRadius: 12, padding: "18px 20px", cursor: "pointer",
                  transition: "border-color 0.15s, transform 0.15s",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#38bdf8";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#1e293b";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Repo name + external link */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GitBranch size={14} color="#38bdf8" />
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#38bdf8" }}>
                      {repo.name}
                    </span>
                    {repo.private && <Lock size={11} color="#94a3b8" />}
                  </div>
                  <a
                    href={repo.html_url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ color: "#475569", display: "flex" }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>

                {/* Description */}
                <p style={{
                  color: "#64748b", fontSize: 12, lineHeight: 1.5,
                  minHeight: 32, margin: 0,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {repo.description || "No description"}
                </p>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                  {repo.language && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: LANG_COLORS[repo.language] ?? "#64748b",
                        display: "inline-block",
                      }} />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{repo.language}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={11} color="#94a3b8" />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{repo.stars}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <GitFork size={11} color="#94a3b8" />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{repo.forks}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>
                    {timeAgo(repo.updated_at)}
                  </span>
                </div>
              </div>
            ))}

            {!loadingRepos && filtered.length === 0 && (
              <p style={{ color: "#475569", fontSize: 13, gridColumn: "1/-1" }}>
                No repos match "{search}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FullScreenSpinner({ text }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 0", gap: 12,
    }}>
      <div style={{
        width: 28, height: 28, border: "3px solid #1e293b",
        borderTopColor: "#38bdf8", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#475569", fontSize: 13 }}>{text}</p>
    </div>
  );
}
