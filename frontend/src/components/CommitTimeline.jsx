import { useState } from "react";
import { GitCommitHorizontal, ChevronDown, ChevronUp, RefreshCw, AlertCircle, FileCode, Plus, Minus } from "lucide-react";

/* ── Type config ─────────────────────────────────────────── */
const TYPE = {
  feature:  { label: "Feature",  bg: "#ffffff", color: "#000000" },
  fix:      { label: "Fix",      bg: "#1a0000", color: "#ff6b6b" },
  refactor: { label: "Refactor", bg: "#0a0a0a", color: "#888888" },
  docs:     { label: "Docs",     bg: "#0a0a0a", color: "#666666" },
  test:     { label: "Test",     bg: "#0a0a0a", color: "#555555" },
  chore:    { label: "Chore",    bg: "#0a0a0a", color: "#444444" },
};

const IMPACT = {
  high:   { dot: "#ffffff", glow: "0 0 8px rgba(255,255,255,0.6)" },
  medium: { dot: "#666666", glow: "none" },
  low:    { dot: "#2a2a2a", glow: "none" },
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/* ── Single commit card ──────────────────────────────────── */
function CommitCard({ commit, owner, repo, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const type   = TYPE[commit.type]   ?? TYPE.chore;
  const impact = IMPACT[commit.impact] ?? IMPACT.low;

  return (
    <div style={{ display: "flex", gap: 0, position: "relative" }}>

      {/* Timeline column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
        {/* Dot */}
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: impact.dot, boxShadow: impact.glow,
          border: "2px solid var(--border3)",
          flexShrink: 0, marginTop: 18, zIndex: 1,
        }} />
        {/* Line */}
        {!isLast && (
          <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 4 }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: isLast ? 0 : 24,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, overflow: "hidden",
        transition: "border-color 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>

          {/* Avatar */}
          {commit.avatar_url ? (
            <img src={commit.avatar_url} alt={commit.author}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border2)", flexShrink: 0, marginTop: 1 }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--surface2)", border: "1px solid var(--border2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <GitCommitHorizontal size={13} color="var(--text3)" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top row: type badge + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
                background: type.bg, color: type.color,
                border: "1px solid var(--border2)",
              }}>
                {type.label}
              </span>
              <span style={{ fontSize: 11, color: "var(--text4)" }}>
                {formatDate(commit.date)} · {formatRelative(commit.date)}
              </span>
              <span style={{ fontSize: 11, color: "var(--text5)", fontFamily: "monospace" }}>
                {commit.sha}
              </span>
              <span style={{ fontSize: 11, color: "var(--text4)", marginLeft: "auto" }}>
                {commit.author}
              </span>
            </div>

            {/* AI title */}
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.4 }}>
              {commit.title}
            </p>

            {/* AI summary */}
            {commit.summary && (
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.65, margin: "0 0 10px" }}>
                {commit.summary}
              </p>
            )}

            {/* What changed bullets */}
            {commit.what_changed && (
              <div style={{ margin: "0 0 12px" }}>
                {(Array.isArray(commit.what_changed)
                  ? commit.what_changed
                  : commit.what_changed.split("\n")
                ).filter(l => String(l).trim()).map((line, i) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--text4)", margin: "2px 0", lineHeight: 1.5 }}>
                    {String(line).startsWith("•") ? line : `• ${line}`}
                  </p>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <FileCode size={11} color="var(--text4)" />
                <span style={{ color: "var(--text4)" }}>{commit.file_count} files</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                <Plus size={10} color="#4ade80" />
                <span style={{ color: "#4ade80", fontFamily: "monospace" }}>{commit.additions}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                <Minus size={10} color="#f87171" />
                <span style={{ color: "#f87171", fontFamily: "monospace" }}>{commit.deletions}</span>
              </span>

              {/* Expand files toggle */}
              {commit.files?.length > 0 && (
                <button onClick={() => setExpanded(p => !p)} style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--text4)", fontSize: 11, display: "flex",
                  alignItems: "center", gap: 4, padding: 0, marginLeft: "auto",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text4)"}
                >
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {expanded ? "Hide files" : "Show files"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* File list — expandable */}
        {expanded && commit.files?.length > 0 && (
          <div style={{
            borderTop: "1px solid var(--border)",
            padding: "10px 16px 12px 56px",
            display: "flex", flexDirection: "column", gap: 3,
          }}>
            {commit.files.map((f, i) => (
              <a
                key={i}
                href={`https://github.com/${owner}/${repo}/commit/${commit.full_sha}#diff-${i}`}
                target="_blank" rel="noreferrer"
                style={{
                  fontSize: 11, color: "var(--text4)", fontFamily: "monospace",
                  textDecoration: "none", display: "block",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text4)"}
              >
                {f}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────── */
export default function CommitTimeline({ owner, repo, token, commits, loading, error, onReload }) {

  if (loading) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "var(--bg)",
      }}>
        <RefreshCw size={24} color="#888" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#888", fontSize: 13 }}>Fetching &amp; analysing commit history…</p>
        <p style={{ color: "#555", fontSize: 11 }}>This runs once — results are cached for 5 minutes</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        background: "var(--bg)",
      }}>
        <AlertCircle size={24} color="#f87171" />
        <p style={{ color: "#f87171", fontSize: 13, maxWidth: 320, textAlign: "center" }}>{error}</p>
        <button onClick={onReload} style={{
          background: "var(--text)", color: "var(--bg)", border: "none",
          borderRadius: 8, padding: "8px 18px", fontSize: 12,
          fontWeight: 600, cursor: "pointer",
        }}>
          Try again
        </button>
      </div>
    );
  }

  if (!commits || commits.length === 0) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        background: "var(--bg)",
      }}>
        <GitCommitHorizontal size={24} color="#444" />
        <p style={{ color: "#666", fontSize: 13 }}>No commits found.</p>
      </div>
    );
  }

  return (
    <div style={{
      height: "100%", overflowY: "auto", background: "var(--bg)",
      padding: "24px 32px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Commit History
          </h2>
          <p style={{ fontSize: 12, color: "var(--text4)", marginTop: 4 }}>
            Last {commits.length} commits · AI-analysed
          </p>
        </div>
        <button onClick={onReload} style={{
          background: "transparent", border: "1px solid var(--border2)",
          borderRadius: 8, padding: "6px 12px", color: "var(--text3)",
          fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="var(--border3)"; e.currentTarget.style.color="var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border2)"; e.currentTarget.style.color="var(--text3)"; }}
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { dot: "#ffffff", glow: "0 0 6px rgba(255,255,255,0.5)", label: "High impact" },
          { dot: "#666666", glow: "none", label: "Medium impact" },
          { dot: "#2a2a2a", glow: "none", label: "Low impact" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, boxShadow: item.glow }} />
            <span style={{ fontSize: 11, color: "var(--text4)" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ maxWidth: 820 }}>
        {commits.map((commit, i) => (
          <CommitCard
            key={commit.full_sha}
            commit={commit}
            owner={owner}
            repo={repo}
            isLast={i === commits.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
