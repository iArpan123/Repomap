import { Handle, Position } from "@xyflow/react";

export const LAYER = {
  user:     { border: "#22d3ee", glow: "rgba(34,211,238,0.25)", badge: "#0e7490", bg: "linear-gradient(145deg,#0d1f2d,#091620)" },
  frontend: { border: "#60a5fa", glow: "rgba(96,165,250,0.25)",  badge: "#1d4ed8", bg: "linear-gradient(145deg,#0e1e3c,#0a1628)" },
  backend:  { border: "#4ade80", glow: "rgba(74,222,128,0.25)",  badge: "#166534", bg: "linear-gradient(145deg,#0a2018,#071510)" },
  database: { border: "#f87171", glow: "rgba(248,113,113,0.25)", badge: "#991b1b", bg: "linear-gradient(145deg,#200d0d,#160808)" },
  external: { border: "#c084fc", glow: "rgba(192,132,252,0.25)", badge: "#6b21a8", bg: "linear-gradient(145deg,#18102e,#100b22)" },
};

export const TIER_LABEL = { 0: "Client", 1: "Frontend", 2: "Backend / API", 3: "Data & External" };

const BAND_COLORS = {
  0: { bg: "rgba(34,211,238,0.035)",  border: "rgba(34,211,238,0.13)"  },
  1: { bg: "rgba(96,165,250,0.035)",  border: "rgba(96,165,250,0.13)"  },
  2: { bg: "rgba(74,222,128,0.035)",  border: "rgba(74,222,128,0.13)"  },
  3: { bg: "rgba(248,113,113,0.035)", border: "rgba(248,113,113,0.13)" },
};

/* ── Swim lane band ───────────────────────────────────────── */
export function TierBandNode({ data }) {
  const c = BAND_COLORS[data.tier] ?? { bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)" };
  return (
    <div style={{
      width: "100%", height: "100%",
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 18,
      pointerEvents: "none",
    }} />
  );
}

/* ── Tier section label ───────────────────────────────────── */
export function TierLabelNode({ data }) {
  return (
    <div style={{
      pointerEvents: "none", userSelect: "none",
      textAlign: "right", whiteSpace: "nowrap",
      fontSize: 10, fontFamily: "ui-monospace,monospace",
      letterSpacing: ".1em", textTransform: "uppercase",
      color: "#475569", fontWeight: 700,
    }}>
      {data.label}
    </div>
  );
}

/* ── Architecture node ────────────────────────────────────── */
export function ArchNode({ data, selected }) {
  const cfg = LAYER[data.layer] ?? LAYER.backend;
  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}${selected ? "ff" : "99"}`,
      borderRadius: 14,
      padding: "10px 16px 12px",
      minWidth: 180,
      maxWidth: 230,
      position: "relative",
      overflow: "hidden",
      boxShadow: selected
        ? `0 0 0 2px ${cfg.border}44, 0 0 26px ${cfg.glow}, 0 6px 20px #00000066`
        : `0 0 14px ${cfg.glow}, 0 3px 12px #00000055`,
      transition: "box-shadow .2s, border-color .2s",
      cursor: "default",
    }}>
      {/* Top accent stripe */}
      <div style={{
        position: "absolute", top: 0, left: "20%", right: "20%", height: 2,
        background: `linear-gradient(90deg,transparent,${cfg.border},transparent)`,
      }} />

      <Handle type="target" position={Position.Top}
        style={{ background: cfg.border, border: "2px solid #0d1117", width: 10, height: 10, top: -5 }} />

      {/* Layer chip */}
      <div style={{
        display: "inline-block",
        background: cfg.badge + "33",
        border: `1px solid ${cfg.border}44`,
        borderRadius: 999, padding: "2px 8px",
        fontSize: 9, letterSpacing: ".07em", textTransform: "uppercase",
        color: cfg.border, fontFamily: "ui-monospace,monospace", marginBottom: 6,
      }}>{data.layer}</div>

      <div style={{
        color: "#f1f5f9", fontSize: 13, fontWeight: 700,
        fontFamily: "ui-sans-serif,system-ui,sans-serif",
        lineHeight: 1.35, marginBottom: data.sublabel ? 4 : 0,
      }}>{data.label}</div>

      {data.sublabel && (
        <div style={{
          color: cfg.border, fontSize: 10.5, opacity: .8,
          fontFamily: "ui-monospace,monospace", lineHeight: 1.35,
        }}>{data.sublabel}</div>
      )}

      <Handle type="source" position={Position.Bottom}
        style={{ background: cfg.border, border: "2px solid #0d1117", width: 10, height: 10, bottom: -5 }} />
    </div>
  );
}

export const nodeTypes = { archNode: ArchNode, tierLabel: TierLabelNode, tierBand: TierBandNode };
