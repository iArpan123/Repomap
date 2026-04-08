import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DiagramPanel, { toFlowFormat } from "../components/DiagramPanel";
import ChatPanel from "../components/ChatPanel";
import RepoHeader from "../components/RepoHeader";
import { Map, ArrowLeft, Loader2, LogOut, RefreshCw, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!user) {
    return (
      <a href="/api/auth/login" style={{
        fontSize: 12, color: "#38bdf8", border: "1px solid #1e40af",
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
        background: "transparent", border: "1px solid #1e293b",
        borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: "#e2e8f0",
      }}>
        <img src={user.avatar_url} alt={user.login}
          style={{ width: 22, height: 22, borderRadius: "50%" }} />
        <span style={{ fontSize: 12, color: "#94a3b8" }}>@{user.login}</span>
        <ChevronDown size={12} color="#64748b" />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          background: "#0d1117", border: "1px solid #1e293b",
          borderRadius: 8, minWidth: 190, zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}>
          <button onClick={() => { navigate("/repos"); setOpen(false); }} style={menuItem}>
            <Map size={13} /> Your repositories
          </button>
          <button onClick={() => { logout(); navigate("/"); }} style={menuItem}>
            <LogOut size={13} /> Sign out
          </button>
          <div style={{ borderTop: "1px solid #1e293b" }} />
          {/* Forces GitHub to show login screen fresh so user can switch account */}
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
  color: "#94a3b8", fontSize: 12, cursor: "pointer", textAlign: "left",
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

  // ── tab indicator ─────────────────────────────────────────
  const diagramTabLabel = diagramLoading
    ? "Generating…"
    : "Architecture Diagram";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Map className="w-5 h-5 text-brand-500" />
        <span className="font-semibold text-sm">RepoMap</span>
        <span className="text-gray-600 text-sm">/</span>
        <a
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline text-sm font-mono"
        >
          {owner}/{repo}
        </a>
        <div style={{ marginLeft: "auto" }}>
          <UserMenu />
        </div>
      </header>

      {loadingRepo && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Fetching repository info…
        </div>
      )}
      {repoError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
          Error: {repoError}
        </div>
      )}

      {repoData && !loadingRepo && (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <RepoHeader meta={repoData.meta} analysis={repoData.analysis} />

          {/* Tabs */}
          <div className="border-b border-gray-800 px-4 flex gap-6 flex-shrink-0">
            {[
              { id: "diagram", label: diagramTabLabel, busy: diagramLoading },
              { id: "chat",    label: "Repo Chat",       busy: false },
            ].map(({ id, label, busy }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === id
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {busy && <Loader2 className="w-3 h-3 animate-spin" />}
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
          </div>
        </div>
      )}
    </div>
  );
}
