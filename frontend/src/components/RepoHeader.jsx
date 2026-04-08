import { Star, GitFork, Code2 } from "lucide-react";

export default function RepoHeader({ meta, analysis }) {
  return (
    <div style={{
      padding: "10px 20px", borderBottom: "1px solid var(--border)",
      background: "var(--bg)", flexShrink: 0,
    }}>
      {meta.description && (
        <p style={{ color: "var(--text4)", fontSize: 12, marginBottom: 8 }}>
          {meta.description}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <Stat icon={<Code2 size={12} />} label={meta.language || "Mixed"} />
        <Stat icon={<Star size={12} />} label={meta.stars.toLocaleString()} />
        <Stat icon={<GitFork size={12} />} label={meta.forks.toLocaleString()} />
        <span style={{ fontSize: 11, color: "var(--text5)" }}>{analysis.total_files} files analysed</span>
        {meta.topics.map(t => (
          <span key={t} style={{
            fontSize: 10, color: "var(--text3)", background: "var(--surface2)",
            border: "1px solid var(--border2)", padding: "2px 8px",
            borderRadius: 99, letterSpacing: "0.03em",
          }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text4)" }}>
      {icon}{label}
    </span>
  );
}
