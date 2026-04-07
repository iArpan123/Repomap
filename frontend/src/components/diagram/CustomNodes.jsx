import { Handle, Position } from "@xyflow/react";

export const LAYER = {
  user:     { border: "#22d3ee", glow: "rgba(34,211,238,0.22)", badge: "#0e7490", bg: "linear-gradient(145deg,#0d1f2d,#091620)" },
  frontend: { border: "#60a5fa", glow: "rgba(96,165,250,0.22)",  badge: "#1d4ed8", bg: "linear-gradient(145deg,#0e1e3c,#0a1628)" },
  backend:  { border: "#4ade80", glow: "rgba(74,222,128,0.22)",  badge: "#166534", bg: "linear-gradient(145deg,#0a2018,#071510)" },
  database: { border: "#f87171", glow: "rgba(248,113,113,0.22)", badge: "#991b1b", bg: "linear-gradient(145deg,#200d0d,#160808)" },
  external: { border: "#c084fc", glow: "rgba(192,132,252,0.22)", badge: "#6b21a8", bg: "linear-gradient(145deg,#18102e,#100b22)" },
};

export const TIER_LABEL = {
  0: "Client",
  1: "Frontend",
  2: "Backend / API",
  3: "Data & External",
};

export function ArchNode({ data, selected }) {
  const cfg = LAYER[data.layer] ?? LAYER.backend;
  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}${selected ? "ff" : "99"}`,
      borderRadius: 12,
      padding: "9px 14px 10px",
      minWidth: 170,
      maxWidth: 210,
      position: "relative",
      overflow: "hidden",
      boxShadow: selected
        ? `0 0 0 2px ${cfg.border}44, 0 0 22px ${cfg.glow}, 0 6px 18px #00000055`
        : `0 0 12px ${cfg.glow}, 0 3px 10px #00000044`,
      transition: "box-shadow .2s, border-color .2s",
      cursor: "default",
    }}>
      {/* Top accent stripe */}
      <div style={{
        position: "absolute", top: 0, left: "18%", right: "18%", height: 2,
        background: `linear-gradient(90deg,transparent,${cfg.border},transparent)`,
        borderRadius: "0 0 3px 3px",
      }} />

      <Handle type="target" position={Position.Top}
        style={{ background: cfg.border, border: "2px solid #0d1117", width: 9, height: 9, top: -4 }} />

      {/* Layer chip */}
      <div style={{
        display: "inline-block",
        background: cfg.badge + "33",
        border: `1px solid ${cfg.border}44`,
        borderRadius: 999, padding: "1px 7px",
        fontSize: 9, letterSpacing: ".06em",
        textTransform: "uppercase",
        color: cfg.border,
        fontFamily: "ui-monospace,monospace",
        marginBottom: 5,
      }}>{data.layer}</div>

      <div style={{
        color: "#f1f5f9", fontSize: 12.5, fontWeight: 700,
        fontFamily: "ui-sans-serif,system-ui,sans-serif",
        lineHeight: 1.35, marginBottom: data.sublabel ? 3 : 0,
      }}>{data.label}</div>

      {data.sublabel && (
        <div style={{
          color: cfg.border, fontSize: 10, opacity: .75,
          fontFamily: "ui-monospace,monospace", lineHeight: 1.3,
        }}>{data.sublabel}</div>
      )}

      <Handle type="source" position={Position.Bottom}
        style={{ background: cfg.border, border: "2px solid #0d1117", width: 9, height: 9, bottom: -4 }} />
    </div>
  );
}

/* Invisible tier-label node rendered as a section heading */
export function TierLabelNode({ data }) {
  return (
    <div style={{
      pointerEvents: "none",
      userSelect: "none",
      fontSize: 10,
      fontFamily: "ui-monospace,monospace",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "#334155",
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>{data.label}</div>
  );
}

export const nodeTypes = { archNode: ArchNode, tierLabel: TierLabelNode };
