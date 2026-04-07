import { useEffect } from "react";
import {
  ReactFlow, ReactFlowProvider,
  Background, Controls, MiniMap,
  MarkerType, BackgroundVariant,
  useNodesState, useEdgesState, useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes, LAYER, TIER_LABEL } from "./diagram/CustomNodes";
import { RefreshCw, Download, AlertCircle, Layers } from "lucide-react";

/* ── Tier layout ──────────────────────────────────────────────
   Horizontal rows per layer — same visual language as
   Google Cloud / AWS architecture diagrams.
──────────────────────────────────────────────────────────────*/
const TIER_ORDER   = { user: 0, frontend: 1, backend: 2, database: 3, external: 3 };
const NODE_W       = 192;
const NODE_H       = 76;
const H_GAP        = 22;
const V_GAP        = 90;
const LABEL_MARGIN = 50;

function tierLayout(rawNodes) {
  const tiers = { 0: [], 1: [], 2: [], 3: [] };
  rawNodes.forEach(n => {
    const t = TIER_ORDER[n.data?.layer] ?? 2;
    tiers[t].push(n);
  });

  tiers[3].sort((a, b) => {
    const o = { database: 0, external: 1 };
    return (o[a.data.layer] ?? 0) - (o[b.data.layer] ?? 0);
  });

  const positioned = [];
  const tierLabelNodes = [];

  [0, 1, 2, 3].forEach(tierIdx => {
    const group = tiers[tierIdx];
    if (!group.length) return;

    const rowW   = group.length * NODE_W + (group.length - 1) * H_GAP;
    const startX = -(rowW / 2);
    const y      = tierIdx * (NODE_H + V_GAP);

    tierLabelNodes.push({
      id: `__tier_${tierIdx}`,
      type: "tierLabel",
      data: { label: TIER_LABEL[tierIdx] ?? "" },
      position: { x: startX - LABEL_MARGIN - 80, y: y + NODE_H / 2 - 7 },
      selectable: false,
      draggable: false,
    });

    group.forEach((n, i) => {
      positioned.push({ ...n, position: { x: startX + i * (NODE_W + H_GAP), y } });
    });
  });

  return [...tierLabelNodes, ...positioned];
}

/* ── Convert Claude JSON → React Flow nodes + edges ─────────*/
export function toFlowFormat(diagramData) {
  const valid = new Set(diagramData.nodes.map(n => n.id));

  const rawNodes = diagramData.nodes.map(n => ({
    id: n.id,
    type: "archNode",
    data: { label: n.label, layer: n.layer ?? "backend", sublabel: n.sublabel ?? "" },
    position: { x: 0, y: 0 },
  }));

  const nodes = tierLayout(rawNodes);

  const edges = diagramData.edges
    .filter(e => valid.has(e.source) && valid.has(e.target))
    .map((e, i) => {
      const srcLayer = diagramData.nodes.find(n => n.id === e.source)?.layer ?? "backend";
      const isPrimary = e.animated ?? false;
      const color     = LAYER[srcLayer]?.border ?? "#475569";

      // Primary (animated) flows: brighter + slightly thicker to stand out.
      // Secondary flows: dimmer to reduce visual noise from overlapping lines.
      const opacity   = isPrimary ? "dd" : "55";
      const width     = isPrimary ? 2.2 : 1.4;

      return {
        id: e.id ?? `e_${e.source}_${e.target}_${i}`,
        source: e.source,
        target: e.target,
        // No labels — they bunch up and overlap along shared paths.
        // Layer position + arrows convey the architecture clearly.
        animated: isPrimary,
        type: "smoothstep",
        style: { stroke: color + opacity, strokeWidth: width },
        markerEnd: { type: MarkerType.ArrowClosed, color: color + opacity, width: 13, height: 13 },
      };
    });

  return { nodes, edges };
}

/* ── Shared button style ─────────────────────────────────────*/
const btnBase = {
  display: "flex", alignItems: "center", gap: 6,
  background: "rgba(15,23,42,0.88)", backdropFilter: "blur(8px)",
  border: "1px solid #1e293b", borderRadius: 10,
  padding: "7px 13px", fontSize: 11.5,
  color: "#64748b", cursor: "pointer",
  transition: "border-color .15s, color .15s",
  fontFamily: "ui-sans-serif,system-ui,sans-serif",
};
const hoverOn  = e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#e2e8f0"; };
const hoverOff = e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#64748b"; };

/* ── Inner canvas (must be inside ReactFlowProvider) ─────────*/
function DiagramInner({ nodes: propNodes, edges: propEdges, meta, nodeCount, loading, error, onRegenerate }) {
  const { fitView }                          = useReactFlow();
  const [nodes, setLocalNodes, onNodesChange] = useNodesState([]);
  const [edges, setLocalEdges, onEdgesChange] = useEdgesState([]);

  // Sync prop changes → local RF state (one direction only, no loop back)
  useEffect(() => { setLocalNodes(propNodes); }, [propNodes]);  // eslint-disable-line
  useEffect(() => { setLocalEdges(propEdges); }, [propEdges]);  // eslint-disable-line

  // Fit view whenever new nodes arrive
  useEffect(() => {
    if (!propNodes.length) return;
    const t = setTimeout(() => fitView({ padding: 0.13, duration: 650 }), 150);
    return () => clearTimeout(t);
  }, [propNodes.length, fitView]);

  function exportSvg() {
    const svg = document.querySelector(".react-flow__renderer svg");
    if (!svg) return;
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([svg.outerHTML], { type: "image/svg+xml" })),
      download: `${meta?.full_name?.replace("/", "-") ?? "repo"}-architecture.svg`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(9,13,19,.82)", backdropFilter: "blur(5px)",
        }}>
          <RefreshCw size={30} className="animate-spin" style={{ color: "#38bdf8", marginBottom: 16 }} />
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>Generating architecture diagram…</p>
          <p style={{ color: "#334155", fontSize: 12, marginTop: 6 }}>This runs in the background — feel free to use Repo Chat</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <AlertCircle size={30} style={{ color: "#f87171" }} />
          <p style={{ color: "#f87171", fontSize: 13, maxWidth: 360, textAlign: "center" }}>{error}</p>
          <button onClick={onRegenerate} style={{ ...btnBase, color: "#38bdf8", borderColor: "#1e40af" }}>
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.13 }}
        minZoom={0.08}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#090d13" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#1a2332" />
        <Controls showInteractive={false} style={{ background: "rgba(15,23,42,.9)", border: "1px solid #1e293b", borderRadius: 10 }} />
        <MiniMap
          nodeColor={n => LAYER[n.data?.layer]?.border ?? "#334155"}
          maskColor="rgba(0,0,0,.75)"
          nodeStrokeWidth={0}
          style={{ background: "#090d13", border: "1px solid #1e293b", borderRadius: 10 }}
        />

        {/* Top-left: info */}
        <Panel position="top-left">
          <div style={{ ...btnBase, cursor: "default", pointerEvents: "none", color: "#94a3b8" }}>
            <Layers size={14} style={{ color: "#38bdf8" }} />
            {meta && <span style={{ fontFamily: "ui-monospace,monospace", color: "#cbd5e1" }}>{meta.full_name}</span>}
            {nodeCount > 0 && <><span style={{ color: "#1e293b" }}>·</span><span>{nodeCount} components</span></>}
          </div>
        </Panel>

        {/* Top-right: actions */}
        <Panel position="top-right">
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onRegenerate} disabled={loading} style={{ ...btnBase, opacity: loading ? .4 : 1 }}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <RefreshCw size={12} /> Regenerate
            </button>
            <button onClick={exportSvg} style={btnBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <Download size={12} /> Export SVG
            </button>
          </div>
        </Panel>

        {/* Bottom-left: legend */}
        <Panel position="bottom-left">
          <div style={{
            background: "rgba(15,23,42,.88)", backdropFilter: "blur(8px)",
            border: "1px solid #1e293b", borderRadius: 12, padding: "10px 14px",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <span style={{ fontSize: 9, color: "#334155", fontFamily: "ui-monospace,monospace", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 2 }}>
              Layers
            </span>
            {Object.entries(LAYER).map(([name, cfg]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.border, boxShadow: `0 0 7px ${cfg.glow}` }} />
                <span style={{ fontSize: 11, color: "#475569", fontFamily: "ui-monospace,monospace", textTransform: "capitalize" }}>{name}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

/* ── Exported wrapper ────────────────────────────────────────*/
export default function DiagramPanel(props) {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 188px)" }}>
      <ReactFlowProvider>
        <DiagramInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
