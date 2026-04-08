import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DiagramPanel, { toFlowFormat } from "../components/DiagramPanel";
import ChatPanel from "../components/ChatPanel";
import CommitTimeline from "../components/CommitTimeline";
import RepoHeader from "../components/RepoHeader";
import { Map, ArrowLeft, Loader2, LogOut, RefreshCw, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!user) {
    return (
      <a href="/api/auth/login" style={{
        fontSize: 12, color: "var(--text2)", border: "1px solid var(--border2)",
        borderRadius: 6, padding: "4px 10px", textDecoration: "none",
      }}>
        Sign in with GitHub
      </a>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "transparent", border: "1px solid var(--border2)",
        borderRadius: 8, padding: "4px 8px", cursor: "pointer",
      }}>
        <img src={user.avatar_url} alt={user.login}
          style={{ width: 22, height: 22, borderRadius: "50%" }} />
        <span style={{ fontSize: 12, color: "var(--text3)" }}>@{user.login}</span>
        <ChevronDown size={12} color="var(--text4)" />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          background: "var(--surface2)", border: "1px solid var(--border2)",
          borderRadius: 8, minWidth: 190, zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}>
          <button onClick={() => { navigate("/repos"); setOpen(false); }} style={menuItem}>
            <Map size={13} /> Your repositories
          </button>
          <button onClick={() => { logout(); navigate("/"); }} style={menuItem}>
            <LogOut size={13} /> Sign out
          </button>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <a href="https://github.com/logout" target="_blank" rel="noreferrer"
            onClick={() => { logout(); }} style={{ ...menuItem, textDecoration: "none" }}>
            <RefreshCw size={13} /> Switch GitHub account
          </a>
        </div>
      )}
    </div>
  );
}

const menuItem = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "9px 14px", background: "transparent", border: "none",
  color: "var(--text3)", fontSize: 12, cursor: "pointer", textAlign: "left",
};

export default function AnalysisPage() {
  const { owner, repo } = useParams();
  const { activeToken: token } = useAuth();

  // ── repo metadata ─────────────────────────────────────────
  const [repoData, setRepoData]     = useState(null);
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [repoError, setRepoError]   = useState("");

  // ── diagram state (lifted here so it survives tab switches) ─
  const [diagramNodes, setDiagramNodes]   = useState([]);
  const [diagramEdges, setDiagramEdges]   = useState([]);
  const [diagramMeta, setDiagramMeta]     = useState(null);
  const [diagramNodeCount, setDiagramNodeCount] = useState(0);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError]   = useState("");

  // ── commit state ──────────────────────────────────────────
  const [commits, setCommits]           = useState(null);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsError, setCommitsError] = useState("");
  const commitsFetched = useRef(false);

  // ── active tab ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("diagram");

  // ── fetch repo metadata ───────────────────────────────────
  useEffect(() => {
    setLoadingRepo(true);
    setRepoError("");
    fetch("/api/repo/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify({ owner, repo }),
    })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e.detail)); return r.json(); })
      .then(setRepoData)
      .catch(e => setRepoError(String(e)))
      .finally(() => setLoadingRepo(false));
  }, [owner, repo]);

  // ── fetch diagram (only once unless manually regenerated) ─
  const fetchDiagram = useCallback(async () => {
    setDiagramLoading(true);
    setDiagramError("");

    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      // On retry, give the backend a moment to finish warming up
      if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
      try {
        const r = await fetch("/api/diagram/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({ owner, repo }),
        });
        if (!r.ok) throw new Error((await r.json()).detail);
        const data = await r.json();
        setDiagramMeta(data.meta);
        const { nodes, edges } = toFlowFormat(data.diagram);
        setDiagramNodeCount(data.diagram.nodes.length);
        setDiagramNodes(nodes);
        setDiagramEdges(edges);
        setDiagramLoading(false);
        return; // success — exit
      } catch (err) {
        lastError = err;
      }
    }

    // Both attempts failed
    setDiagramError(String(lastError));
    setDiagramLoading(false);
  }, [owner, repo]);

  // Auto-start diagram fetch once (regardless of active tab)
  useEffect(() => {
    fetchDiagram();
  }, [fetchDiagram]);

  // ── fetch commits (lazy — only on first tab open, or manual reload) ─
  const fetchCommits = useCallback(async (force = false) => {
    setCommitsLoading(true);
    setCommitsError("");
    try {
      const r = await fetch("/api/commits/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ owner, repo, force }),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      const data = await r.json();
      setCommits(data.commits);
    } catch (err) {
      setCommitsError(String(err));
    } finally {
      setCommitsLoading(false);
    }
  }, [owner, repo, token]);

  // Trigger commits fetch when tab is first opened
  useEffect(() => {
    if (activeTab === "commits" && !commitsFetched.current) {
      commitsFetched.current = true;
      fetchCommits();
    }
  }, [activeTab, fetchCommits]);

  // ── tab indicator ─────────────────────────────────────────
  const diagramTabLabel = diagramLoading
    ? "Generating…"
    : "Architecture Diagram";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header style={{
        borderBottom: "1px solid #111", background: "#000",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <Link to="/" style={{ color: "#444", display: "flex", transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color="#fff"}
          onMouseLeave={e => e.currentTarget.style.color="#444"}>
          <ArrowLeft size={16} />
        </Link>
        <Map size={16} color="#fff" />
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.3px" }}>RepoMap</span>
        <span style={{ color: "#222", fontSize: 14 }}>/</span>
        <a
          href={`https://github.com/${owner}/${repo}`}
          target="_blank" rel="noreferrer"
          style={{ color: "#888", fontSize: 13, fontFamily: "monospace", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color="#fff"}
          onMouseLeave={e => e.currentTarget.style.color="#888"}
        >
          {owner}/{repo}
        </a>
        <div style={{ marginLeft: "auto" }}>
          <UserMenu />
        </div>
      </header>

      {loadingRepo && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 13 }}>
          Fetching repository info…
        </div>
      )}
      {repoError && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontSize: 13 }}>
          Error: {repoError}
        </div>
      )}

      {repoData && !loadingRepo && (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <RepoHeader meta={repoData.meta} analysis={repoData.analysis} />

          {/* Tabs */}
          <div style={{
            borderBottom: "1px solid #111", padding: "0 16px",
            display: "flex", gap: 24, flexShrink: 0, background: "#000",
          }}>
            {[
              { id: "diagram", label: diagramTabLabel,    busy: diagramLoading },
              { id: "chat",    label: "Repo Chat",         busy: false },
              { id: "commits", label: "Commit History",    busy: commitsLoading },
            ].map(({ id, label, busy }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  padding: "12px 0", fontSize: 13, fontWeight: 600,
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  color: activeTab === id ? "#fff" : "#444",
                  borderBottom: `2px solid ${activeTab === id ? "#fff" : "transparent"}`,
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => { if (activeTab !== id) e.currentTarget.style.color = "#888"; }}
                onMouseLeave={e => { if (activeTab !== id) e.currentTarget.style.color = "#444"; }}
              >
                {busy && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                {label}
              </button>
            ))}
          </div>

          {/*
            Both panels are always mounted — only visibility toggles.
            This keeps diagram state alive while chatting and vice-versa.
          */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div style={{ display: activeTab === "diagram" ? "block" : "none", height: "100%" }}>
              <DiagramPanel
                owner={owner}
                repo={repo}
                nodes={diagramNodes}
                edges={diagramEdges}
                meta={diagramMeta}
                nodeCount={diagramNodeCount}
                loading={diagramLoading}
                error={diagramError}
                onRegenerate={fetchDiagram}
              />
            </div>
            <div style={{ display: activeTab === "chat" ? "block" : "none", height: "100%" }}>
              <ChatPanel owner={owner} repo={repo} token={token} />
            </div>
            <div style={{ display: activeTab === "commits" ? "block" : "none", height: "100%" }}>
              <CommitTimeline
                owner={owner}
                repo={repo}
                token={token}
                commits={commits}
                loading={commitsLoading}
                error={commitsError}
                onReload={() => fetchCommits(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
