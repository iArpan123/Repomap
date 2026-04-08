import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GH_ICON = (
  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "currentColor", flexShrink: 0 }}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export default function HomePage() {
  const [url, setUrl]           = useState("");
  const [urlError, setUrlError] = useState("");
  const [showPat, setShowPat]   = useState(false);
  const [patInput, setPatInput] = useState("");
  const [hovered, setHovered]   = useState(null);
  const navigate                = useNavigate();
  const { user, pat, savePat }  = useAuth();

  function parseRepo(value) {
    const clean = value.trim().replace(/\/$/, "").replace(/\.git$/, "");
    const m1 = clean.match(/github\.com\/([^/]+)\/([^/\s]+)/);
    if (m1) return { owner: m1[1], repo: m1[2] };
    const m2 = clean.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (m2) return { owner: m2[1], repo: m2[2] };
    return null;
  }

  function handleExplore(e) {
    e.preventDefault();
    const parsed = parseRepo(url);
    if (!parsed) { setUrlError('Enter a valid GitHub URL or "owner/repo"'); return; }
    setUrlError("");
    if (patInput.trim()) savePat(patInput.trim());
    navigate(`/repo/${parsed.owner}/${parsed.repo}`);
  }

  const leftActive  = hovered === "left"  || (!hovered && !!user);
  const rightActive = hovered === "right" || (!hovered && !user);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── LEFT: OAuth ─────────────────────────────────────── */}
      <div
        onMouseEnter={() => setHovered("left")}
        onMouseLeave={() => setHovered(null)}
        style={{
          flex: leftActive ? "0 0 55%" : "0 0 45%",
          transition: "flex 0.5s cubic-bezier(0.4,0,0.2,1)",
          background: hovered === "left" ? "var(--surface)" : "var(--bg)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 56px",
          borderRight: "1px solid var(--border)",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: "none", stroke: "var(--text)", strokeWidth: 2, strokeLinecap: "round" }}>
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text)" }}>RepoMap</span>
        </div>

        <h1 style={{
          fontSize: 38, fontWeight: 800, lineHeight: 1.15,
          letterSpacing: "-1.5px", textAlign: "center", marginBottom: 14,
          maxWidth: 340, color: "var(--text)",
        }}>
          Your repos,<br />mapped instantly.
        </h1>

        <p style={{
          color: "var(--text3)", fontSize: 13, textAlign: "center",
          lineHeight: 1.75, maxWidth: 300, marginBottom: 40,
        }}>
          Sign in with GitHub to browse all your repositories — public and private — and generate architecture diagrams in seconds.
        </p>

        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", border: "1px solid var(--border2)",
              borderRadius: 10, background: "var(--surface2)",
            }}>
              <img src={user.avatar_url} alt={user.login}
                style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border2)" }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text)" }}>{user.name || user.login}</p>
                <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>@{user.login}</p>
              </div>
            </div>
            <InvertBtn onClick={() => navigate("/repos")}>
              View your repositories →
            </InvertBtn>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 300 }}>
            <a href="/api/auth/login" style={{ textDecoration: "none", display: "block" }}>
              <InvertBtn as="div">
                {GH_ICON} Sign in with GitHub
              </InvertBtn>
            </a>
          </div>
        )}

        <span style={{
          position: "absolute", bottom: 24, left: 0, right: 0,
          textAlign: "center", fontSize: 10, color: "var(--text6)",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          OAuth · Private repos included
        </span>
      </div>

      {/* ── RIGHT: URL + PAT ────────────────────────────────── */}
      <div
        onMouseEnter={() => setHovered("right")}
        onMouseLeave={() => setHovered(null)}
        style={{
          flex: rightActive ? "0 0 55%" : "0 0 45%",
          transition: "flex 0.5s cubic-bezier(0.4,0,0.2,1)",
          background: hovered === "right" ? "var(--surface)" : "var(--surface)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 56px", position: "relative",
        }}
      >
        <h2 style={{
          fontSize: 30, fontWeight: 800, letterSpacing: "-1px",
          textAlign: "center", marginBottom: 10, color: "var(--text)",
        }}>
          Explore any repo
        </h2>
        <p style={{
          color: "var(--text3)", fontSize: 13, textAlign: "center",
          lineHeight: 1.75, maxWidth: 260, marginBottom: 32,
        }}>
          Paste any public GitHub URL — no login required.
        </p>

        <form onSubmit={handleExplore} style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              value={url}
              onChange={e => { setUrl(e.target.value); setUrlError(""); }}
              placeholder="github.com/owner/repo"
              style={{
                flex: 1, background: "var(--bg)", border: "1px solid var(--border2)",
                borderRadius: 8, padding: "11px 14px", color: "var(--text)",
                fontSize: 13, outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "var(--text)"}
              onBlur={e => e.target.style.borderColor = "var(--border2)"}
            />
            <button type="submit" style={{
              background: "var(--text)", color: "var(--bg)",
              border: "1px solid var(--text)",
              borderRadius: 8, padding: "11px 18px", fontWeight: 700,
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="var(--text)"; e.currentTarget.style.color="var(--bg)"; }}
            >
              Explore →
            </button>
          </div>
          {urlError && <p style={{ color: "#f87171", fontSize: 11, marginBottom: 6 }}>{urlError}</p>}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 10, color: "var(--text5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Private repo?
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* PAT toggle */}
          <button type="button" onClick={() => setShowPat(p => !p)} style={{
            width: "100%", background: "transparent",
            border: "1px solid var(--border2)", borderRadius: 8,
            padding: "10px 14px", color: "var(--text3)", fontSize: 12,
            cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--border3)"; e.currentTarget.style.color="var(--text2)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border2)"; e.currentTarget.style.color="var(--text3)"; }}
          >
            <span>Use a Personal Access Token</span>
            <span style={{
              display: "inline-block",
              transform: showPat ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
            }}>↓</span>
          </button>

          {/* PAT slide */}
          <div style={{
            overflow: "hidden",
            maxHeight: showPat ? "160px" : "0px",
            transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}>
            <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="password"
                value={patInput}
                onChange={e => setPatInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: "100%", background: "var(--bg)", border: "1px solid var(--border2)",
                  borderRadius: 8, padding: "10px 14px", color: "var(--text)",
                  fontSize: 12, outline: "none", fontFamily: "monospace", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "var(--text)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
              {pat && !patInput && (
                <p style={{ fontSize: 11, color: "#4ade80", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  ✓ Token active for this session
                  <button type="button" onClick={() => savePat("")}
                    style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
                    clear
                  </button>
                </p>
              )}
              <p style={{ fontSize: 11, color: "var(--text5)", margin: 0, lineHeight: 1.6 }}>
                GitHub → Settings → Developer Settings → Personal Access Tokens → select <code style={{ color: "var(--text4)" }}>repo</code> scope
              </p>
            </div>
          </div>
        </form>

        <span style={{
          position: "absolute", bottom: 24, left: 0, right: 0,
          textAlign: "center", fontSize: 10, color: "var(--text6)",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          No login · Public repos · PAT for private
        </span>
      </div>
    </div>
  );
}

function InvertBtn({ children, onClick, as: Tag = "button" }) {
  const [hover, setHover] = useState(false);
  return (
    <Tag onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, width: "100%", padding: "13px 20px",
        background: hover ? "transparent" : "var(--text)",
        color: hover ? "var(--text)" : "var(--bg)",
        border: "1px solid var(--text)",
        borderRadius: 10, fontWeight: 700, fontSize: 14,
        cursor: "pointer", textDecoration: "none",
        transition: "background 0.25s ease, color 0.25s ease",
      }}
    >
      {children}
    </Tag>
  );
}
