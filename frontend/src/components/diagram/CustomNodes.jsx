import { Handle, Position } from "@xyflow/react";

export const LAYER = {
  user: {
    border: "#22d3ee",
    glow: "rgba(34,211,238,0.25)",
    badge: "#0e7490",
    bg: "linear-gradient(145deg,#0d1f2d 0%,#0a1820 100%)",
  },
  frontend: {
    border: "#3b82f6",
    glow: "rgba(59,130,246,0.25)",
    badge: "#1d4ed8",
    bg: "linear-gradient(145deg,#0e1e3c 0%,#0b1830 100%)",
  },
  backend: {
    border: "#22c55e",
    glow: "rgba(34,197,94,0.25)",
    badge: "#15803d",
    bg: "linear-gradient(145deg,#091f12 0%,#06180d 100%)",
  },
  database: {
    border: "#f87171",
    glow: "rgba(248,113,113,0.25)",
    badge: "#b91c1c",
    bg: "linear-gradient(145deg,#200d0d 0%,#180909 100%)",
  },
  external: {
    border: "#a855f7",
    glow: "rgba(168,85,247,0.25)",
    badge: "#7e22ce",
    bg: "linear-gradient(145deg,#180f2d 0%,#110b22 100%)",
  },
};

export function ArchNode({ data, selected }) {
  const cfg = LAYER[data.layer] ?? LAYER.backend;
  return (
    <div
      style={{
        background: cfg.bg,
        border: `1.5px solid ${selected ? cfg.border : cfg.border + "cc"}`,
        borderRadius: "14px",
        padding: "10px 18px 12px",
        minWidth: "170px",
        maxWidth: "230px",
        boxShadow: selected
          ? `0 0 0 2px ${cfg.border}55, 0 0 24px ${cfg.glow}, 0 8px 20px rgba(0,0,0,0.5)`
          : `0 0 14px ${cfg.glow}, 0 4px 12px rgba(0,0,0,0.4)`,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: "2px",
          borderRadius: "0 0 4px 4px",
          background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)`,
          opacity: 0.9,
        }}
      />

      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: cfg.border,
          border: `2px solid #0d1117`,
          width: 10,
          height: 10,
          top: -5,
        }}
      />

      {/* Layer badge */}
      <div
        style={{
          display: "inline-block",
          background: cfg.badge + "44",
          border: `1px solid ${cfg.border}55`,
          borderRadius: "999px",
          padding: "1px 8px",
          fontSize: "9px",
          fontFamily: "ui-monospace,monospace",
          color: cfg.border,
          marginBottom: "6px",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {data.layer}
      </div>

      <div
        style={{
          color: "#f1f5f9",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "ui-sans-serif,system-ui,sans-serif",
          lineHeight: 1.35,
          marginBottom: data.sublabel ? "4px" : 0,
        }}
      >
        {data.label}
      </div>

      {data.sublabel && (
        <div
          style={{
            color: cfg.border,
            fontSize: "10px",
            fontFamily: "ui-monospace,monospace",
            opacity: 0.75,
            lineHeight: 1.3,
          }}
        >
          {data.sublabel}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: cfg.border,
          border: `2px solid #0d1117`,
          width: 10,
          height: 10,
          bottom: -5,
        }}
      />
    </div>
  );
}

export const nodeTypes = { archNode: ArchNode };
