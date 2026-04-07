import { useState, useEffect, useCallback } from "react";
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
   Nodes are arranged in horizontal rows per architectural tier:
     Row 0 → user
     Row 1 → frontend
     Row 2 → backend
     Row 3 → database + external (side by side)
   This mirrors how Google / AWS draw architecture diagrams.
──────────────────────────────────────────────────────────────*/
const TIER_ORDER = { user: 0, frontend: 1, backend: 2, database: 3, external: 3 };
const NODE_W  = 192;
const NODE_H  = 76;
const H_GAP   = 22;   // horizontal gap between nodes in same row
const V_GAP   = 90;   // vertical gap between rows (room for edge labels)
const LABEL_MARGIN = 50; // px to the left of each row for tier label

function tierLayout(rawNodes) {
  /* group by tier (bucket database+external into tier 3 together) */
  const tiers = { 0: [], 1: [], 2: [], 3: [] };
  rawNodes.forEach(n => {
    const t = TIER_ORDER[n.data?.layer] ?? 2;
    tiers[t].push(n);
  });

  /* within tier 3 sort: database first, then external */
  tiers[3].sort((a, b) => {
    const order = { database: 0, external: 1 };
    return (order[a.data.layer] ?? 0) - (order[b.data.layer] ?? 0);
  });

  const positioned = [];
  const tierLabelNodes = [];

  [0, 1, 2, 3].forEach(tierIdx => {
    const group = tiers[tierIdx];
    if (!group.length) return;

    const rowW   = group.length * NODE_W + (group.length - 1) * H_GAP;
    const startX = -(rowW / 2);
    const y      = tierIdx * (NODE_H + V_GAP);

    /* tier label node (purely decorative) */
    tierLabelNodes.push({
      id: `__tier_${tierIdx}`,
      type: "tierLabel",
      data: { label: TIER_LABEL[tierIdx] ?? "" },
      position: { x: startX - LABEL_MARGIN - 80, y: y + NODE_H / 2 - 7 },
      selectable: false,
      draggable: false,
    });

    group.forEach((n, i) => {
      positioned.push({
        ...n,
        position: { x: startX + i * (NODE_W + H_GAP), y },
      });
    });
  });

  return [...tierLabelNodes, ...positioned];
}

/* ── Convert Claude JSON → React Flow nodes + edges ──────────*/
function toFlowFormat(diagramData) {
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
      const color    = LAYER[srcLayer]?.border ?? "#475569";
      return {
        id: e.id ?? `e_${e.source}_${e.target}_${i}`,
        source: e.source,
        target: e.target,
        label: e.label ?? "",
        animated: e.animated ?? false,
        type: "smoothstep",
        pathOptions: { borderRadius: 16 },
        style: { stroke: color + "bb", strokeWidth: 1.8 },
        labelStyle: { fill: "#94a3b8", fontSize: 10, fontFamily: "ui-monospace,monospace", fontWeight: 600 },
        labelBgStyle: { fill: "#0d1117", fillOpacity: .9, rx: 5, ry: 5 },
        labelBgPadding: [3, 7],
        markerEnd: { type: MarkerType.ArrowClosed, color: color + "bb", width: 13, height: 13 },
      };
    });

  return { nodes, edges };
}

/* ── Inner component (needs ReactFlowProvider context) ────────*/
function DiagramInner({ owner, repo }) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [repometa, setRepometa]          = useState(null);
  const [nodeCount, setNodeCount]        = useState(0);
  const [loading, setLoading]            = useState(true);
  const [error, setError]                = useState("");

  const fetchDiagram = useCallback(async () => {
    setLoading(true);
    setError("");
    setNodes([]);
    setEdges([]);
    try {
      const r = await fetch("/api/diagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      const data = await r.json();
      setRepometa(data.meta);
      const { nodes: n, edges: e } = toFlowFormat(data.diagram);
      setNodeCount(data.diagram.nodes.length);
      setNodes(n);
      setEdges(e);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => { fetchDiagram(); }, [fetchDiagram]);

  /* fit after nodes paint — two-frame delay */
  useEffect(() => {
    if (!nodes.length) return;
    const t = setTimeout(() =>
      fitView({ padding: 0.13, duration: 650, includeHiddenNodes: false }), 150);
    return () => clearTimeout(t);
  }, [nodes.length, fitView]);

  function exportSvg() {
    const svg = document.querySelector(".react-flow__renderer svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a    = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${owner}-${repo}-architecture.svg`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── shared panel button style ── */
  const btnStyle = {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(15,23,42,0.88)", backdropFilter: "blur(8px)",
    border: "1px solid #1e293b", borderRadius: 10,
    padding: "7px 13px", fontSize: 11.5,
    color: "#64748b", cursor: "pointer",
    transition: "border-color .15s, color .15s",
    fontFamily: "ui-sans-serif,system-ui,sans-serif",
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>

      {/* Loading */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(9,13,19,.82)", backdropFilter: "blur(5px)",
        }}>
          <RefreshCw size={30} className="animate-spin" style={{ color: "#38bdf8", marginBottom: 16 }} />
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>Generating architecture diagram…</p>
          <p style={{ color: "#334155", fontSize: 12, marginTop: 6 }}>Analysing {owner}/{repo} · ~20 seconds</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12,
        }}>
          <AlertCircle size={30} style={{ color: "#f87171" }} />
          <p style={{ color: "#f87171", fontSize: 13, maxWidth: 360, textAlign: "center" }}>{error}</p>
          <button onClick={fetchDiagram} style={{ ...btnStyle, color: "#38bdf8", borderColor: "#1e40af" }}>
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
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        {/* Subtle dot grid */}
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#1a2332" />

        {/* Zoom controls */}
        <Controls
          showInteractive={false}
          style={{
            background: "rgba(15,23,42,.9)",
            border: "1px solid #1e293b",
            borderRadius: 10,
            boxShadow: "0 4px 16px #00000055",
          }}
        />

        {/* Minimap */}
        <MiniMap
          nodeColor={n => LAYER[n.data?.layer]?.border ?? "#334155"}
          maskColor="rgba(0,0,0,.75)"
          nodeStrokeWidth={0}
          style={{
            background: "#090d13",
            border: "1px solid #1e293b",
            borderRadius: 10,
          }}
        />

        {/* ── Top-left: repo info ── */}
        <Panel position="top-left">
          <div style={{
            ...btnStyle, gap: 10, cursor: "default",
            color: "#94a3b8", pointerEvents: "none",
          }}>
            <Layers size={14} style={{ color: "#38bdf8" }} />
            {repometa && (
              <span style={{ fontFamily: "ui-monospace,monospace", color: "#cbd5e1" }}>
                {repometa.full_name}
              </span>
            )}
            {nodeCount > 0 && (
              <>
                <span style={{ color: "#1e293b" }}>·</span>
                <span>{nodeCount} components</span>
              </>
            )}
          </div>
        </Panel>

        {/* ── Top-right: actions ── */}
        <Panel position="top-right">
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchDiagram} disabled={loading} style={{ ...btnStyle, opacity: loading ? .4 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#e2e8f0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#64748b"; }}>
              <RefreshCw size={12} /> Regenerate
            </button>
            <button onClick={exportSvg} style={btnStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#e2e8f0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#64748b"; }}>
              <Download size={12} /> Export SVG
            </button>
          </div>
        </Panel>

        {/* ── Bottom-left: layer legend ── */}
        <Panel position="bottom-left">
          <div style={{
            background: "rgba(15,23,42,.88)", backdropFilter: "blur(8px)",
            border: "1px solid #1e293b", borderRadius: 12,
            padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8,
          }}>
            <span style={{ fontSize: 9, color: "#334155", fontFamily: "ui-monospace,monospace",
              letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 2 }}>
              Layers
            </span>
            {Object.entries(LAYER).map(([name, cfg]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: cfg.border, boxShadow: `0 0 7px ${cfg.glow}`,
                }} />
                <span style={{ fontSize: 11, color: "#475569",
                  fontFamily: "ui-monospace,monospace", textTransform: "capitalize" }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

/* ── Exported component ───────────────────────────────────────*/
export default function DiagramPanel({ owner, repo }) {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 188px)" }}>
      <ReactFlowProvider>
        <DiagramInner owner={owner} repo={repo} />
      </ReactFlowProvider>
    </div>
  );
}
