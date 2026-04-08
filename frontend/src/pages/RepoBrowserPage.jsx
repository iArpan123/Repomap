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
  const [repos, setRepos]             = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError]             = useState("");
  const [searchParams]                = useSearchParams();
  const navigate                      = useNavigate();

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) { login(t); window.history.replaceState({}, "", "/repos"); }
  }, []);

  useEffect(() => {
    if (!authLoading && !token) navigate("/");
  }, [authLoading, token]);

  useEffect(() => {
    if (!token) return;
    setLoadingRepos(true);
    fetch("/api/auth/repos", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setRepos(data); setFiltered(data); })
      .catch(() => setError("Failed to load repositories."))
      .finally(() => setLoadingRepos(false));
  }, [token]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(repos.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.language || "").toLowerCase().includes(q)
    ));
  }, [search, repos]);

  function timeAgo(iso) {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  if (authLoading) return <Spinner text="Authenticating…" fullPage />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      {/* Navbar */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 32px", borderBottom: "1px solid var(--border)",
        background: "var(--bg)", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          onClick={() => navigate("/")}>
          <Map size={18} color="var(--text)" />
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>RepoMap</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && (
            <>
              <img src={user.avatar_url} alt={user.login}
                style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--border2)" }} />
              <span style={{ fontSize: 12, color: "var(--text3)" }}>@{user.login}</span>
              <NavBtn onClick={() => { logout(); navigate("/"); }}>
                <LogOut size={11} /> Sign out
              </NavBtn>
              <a href="https://github.com/logout" target="_blank" rel="noreferrer"
                onClick={() => logout()} style={{ textDecoration: "none" }}>
                <NavBtn as="span">Switch account</NavBtn>
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: "40px 32px 24px", maxWidth: 1140, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6, color: "var(--text)" }}>
          Your Repositories
        </h1>
        <p style={{ color: "var(--text4)", fontSize: 13, marginBottom: 28 }}>
          {repos.length} repos — click any to generate its architecture diagram
        </p>

        <div style={{ position: "relative", maxWidth: 360 }}>
          <Search size={13} style={{
            position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", color: "var(--text4)",
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repositories…"
            style={{
              width: "100%", background: "var(--surface)", border: "1px solid var(--border2)",
              borderRadius: 8, padding: "9px 12px 9px 34px", color: "var(--text)",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "var(--text)"}
            onBlur={e => e.target.style.borderColor = "var(--border2)"}
          />
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "0 32px 60px", maxWidth: 1140, margin: "0 auto" }}>
        {loadingRepos && <Spinner text="Loading repositories…" />}
        {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

        {!loadingRepos && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}>
            {filtered.map(repo => (
              <RepoCard key={repo.full_name} repo={repo}
                onClick={() => navigate(`/repo/${repo.owner}/${repo.name}`)}
                timeAgo={timeAgo} />
            ))}
            {filtered.length === 0 && (
              <p style={{ color: "var(--text5)", fontSize: 13, gridColumn: "1/-1", paddingTop: 20 }}>
                No repos match "{search}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RepoCard({ repo, onClick, timeAgo }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "var(--surface2)" : "var(--surface)",
        border: `1px solid ${hover ? "var(--border3)" : "var(--border)"}`,
        borderRadius: 10, padding: "16px 18px", cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 10,
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <GitBranch size={13} color={hover ? "var(--text)" : "var(--text3)"} />
          <span style={{ fontWeight: 600, fontSize: 13, color: hover ? "var(--text)" : "var(--text2)" }}>
            {repo.name}
          </span>
          {repo.private && <Lock size={10} color="var(--text4)" />}
        </div>
        <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: "var(--text5)", display: "flex" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text5)"}
        >
          <ExternalLink size={12} />
        </a>
      </div>

      <p style={{
        color: "var(--text4)", fontSize: 12, lineHeight: 1.5, margin: 0, minHeight: 30,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {repo.description || "No description"}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
        {repo.language && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              width: 9, height: 9, borderRadius: "50%",
              background: LANG_COLORS[repo.language] ?? "var(--text4)",
              display: "inline-block",
            }} />
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{repo.language}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Star size={10} color="var(--text4)" />
          <span style={{ fontSize: 11, color: "var(--text4)" }}>{repo.stars}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <GitFork size={10} color="var(--text4)" />
          <span style={{ fontSize: 11, color: "var(--text4)" }}>{repo.forks}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text5)", marginLeft: "auto" }}>
          {timeAgo(repo.updated_at)}
        </span>
      </div>
    </div>
  );
}

function NavBtn({ children, onClick, as: Tag = "button" }) {
  const [hover, setHover] = useState(false);
  return (
    <Tag onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: hover ? "var(--text)" : "transparent",
        color: hover ? "var(--bg)" : "var(--text3)",
        border: "1px solid var(--border2)",
        borderRadius: 6, padding: "4px 10px",
        cursor: "pointer", fontSize: 11, fontWeight: 500,
        transition: "all 0.2s ease", textDecoration: "none",
      }}>
      {children}
    </Tag>
  );
}

function Spinner({ text, fullPage }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: fullPage ? "0" : "60px 0",
      height: fullPage ? "100vh" : "auto", gap: 12,
    }}>
      <div style={{
        width: 22, height: 22, border: "2px solid var(--border2)",
        borderTopColor: "var(--text)", borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: "var(--text4)", fontSize: 12 }}>{text}</p>
    </div>
  );
}
