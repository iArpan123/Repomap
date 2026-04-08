import { useEffect, useCallback, useRef } from "react";
import {
  ReactFlow, ReactFlowProvider,
  Background, Controls, MiniMap,
  MarkerType, BackgroundVariant,
  useNodesState, useEdgesState, useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { nodeTypes, LAYER, TIER_LABEL } from "./diagram/CustomNodes";
import { RefreshCw, Download, AlertCircle, Layers } from "lucide-react";

/* ── Layout constants ────────────────────────────────────────*/
const TIER_ORDER = { user: 0, frontend: 1, backend: 2, database: 3, external: 3 };
const NODE_W     = 210;
const NODE_H     = 84;
const H_GAP      = 36;   // horizontal gap between nodes in same tier
const V_GAP      = 110;  // vertical gap between tiers
const BAND_PX    = 48;   // band horizontal padding beyond nodes
const BAND_PY    = 18;   // band vertical padding above/below nodes
const LABEL_W    = 110;  // width reserved left of band for tier label

/* ── Swim-lane layout ────────────────────────────────────────*/
function tierLayout(rawNodes) {
  const tiers = { 0: [], 1: [], 2: [], 3: [] };
  rawNodes.forEach(n => {
    const t = TIER_ORDER[n.data?.layer] ?? 2;
    tiers[t].push(n);
  });

  // Keep database before external within tier 3
  tiers[3].sort((a, b) => {
    const o = { database: 0, external: 1 };
    return (o[a.data.layer] ?? 0) - (o[b.data.layer] ?? 0);
  });

  // Find widest tier so all bands share the same width
  let maxRowW = 0;
  [0, 1, 2, 3].forEach(i => {
    const g = tiers[i];
    if (!g.length) return;
    const w = g.length * NODE_W + (g.length - 1) * H_GAP;
    if (w > maxRowW) maxRowW = w;
  });
  const bandW = maxRowW + BAND_PX * 2;

  const bands = [], labels = [], nodes = [];

  [0, 1, 2, 3].forEach(tierIdx => {
    const group = tiers[tierIdx];
    if (!group.length) return;

    const rowW   = group.length * NODE_W + (group.length - 1) * H_GAP;
    const startX = -(rowW / 2);
    const y      = tierIdx * (NODE_H + V_GAP + BAND_PY * 2);

    // Swim-lane background band (rendered first → behind nodes)
    bands.push({
      id: `__band_${tierIdx}`,
      type: "tierBand",
      data: { tier: tierIdx },
      position: { x: -(bandW / 2), y: y - BAND_PY },
      style: { width: bandW, height: NODE_H + BAND_PY * 2 },
      selectable: false, draggable: false,
    });

    // Tier label to the left of each band
    labels.push({
      id: `__label_${tierIdx}`,
      type: "tierLabel",
      data: { label: TIER_LABEL[tierIdx] ?? "" },
      position: { x: -(bandW / 2) - LABEL_W - 12, y: y + NODE_H / 2 - 8 },
      selectable: false, draggable: false,
    });

    group.forEach((n, i) => {
      nodes.push({ ...n, position: { x: startX + i * (NODE_W + H_GAP), y } });
    });
  });

  return [...bands, ...labels, ...nodes];
}

/* ── Convert Claude JSON → React Flow ───────────────────────*/
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
      const srcLayer  = diagramData.nodes.find(n => n.id === e.source)?.layer ?? "backend";
      const isPrimary = e.animated ?? false;
      const color     = LAYER[srcLayer]?.border ?? "#475569";
      const opacity   = isPrimary ? "cc" : "44";
      const width     = isPrimary ? 2.5 : 1.5;

      return {
        id: e.id ?? `e_${e.source}_${e.target}_${i}`,
        source: e.source,
        target: e.target,
        animated: isPrimary,
        type: "smoothstep",
        style: { stroke: color + opacity, strokeWidth: width },
        markerEnd: { type: MarkerType.ArrowClosed, color: color + opacity, width: 14, height: 14 },
      };
    });

  return { nodes, edges };
}

/* ── Button styles ───────────────────────────────────────────*/
const btnBase = {
  display: "flex", alignItems: "center", gap: 6,
  background: "rgba(9,13,19,0.9)", backdropFilter: "blur(10px)",
  border: "1px solid #1e293b", borderRadius: 10,
  padding: "7px 13px", fontSize: 11.5,
  color: "#64748b", cursor: "pointer",
  transition: "border-color .15s, color .15s",
  fontFamily: "ui-sans-serif,system-ui,sans-serif",
};
const hoverOn  = e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#e2e8f0"; };
const hoverOff = e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#64748b"; };

/* ── Inner canvas ────────────────────────────────────────────*/
function DiagramInner({ nodes: propNodes, edges: propEdges, meta, nodeCount, loading, error, onRegenerate }) {
  const { fitView }                            = useReactFlow();
  const [nodes, setLocalNodes, onNodesChange]  = useNodesState([]);
  const [edges, setLocalEdges, onEdgesChange]  = useEdgesState([]);
  const canvasRef = useRef(null);

  useEffect(() => { setLocalNodes(propNodes); }, [propNodes]);  // eslint-disable-line
  useEffect(() => { setLocalEdges(propEdges); }, [propEdges]);  // eslint-disable-line

  const doFit = useCallback(() => {
    fitView({ padding: 0.18, duration: 700, includeHiddenNodes: false });
  }, [fitView]);

  // Fit when nodes first arrive
  useEffect(() => {
    if (!propNodes.length) return;
    const t = setTimeout(doFit, 100);
    return () => clearTimeout(t);
  }, [propNodes.length, doFit]);

  function exportPng() {
    if (!canvasRef.current) return;
    toPng(canvasRef.current, { backgroundColor: "#080b10", pixelRatio: 2 })
      .then(dataUrl => {
        const a = Object.assign(document.createElement("a"), {
          href: dataUrl,
          download: `${meta?.full_name?.replace("/", "-") ?? "repo"}-architecture.png`,
        });
        a.click();
      });
  }

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%", position: "relative" }}>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(9,13,19,.85)", backdropFilter: "blur(6px)",
        }}>
          <RefreshCw size={28} style={{ color: "#38bdf8", marginBottom: 16, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>Generating architecture diagram…</p>
          <p style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>This runs in the background — feel free to use Repo Chat</p>
        </div>
      )}

      {/* Error overlay */}
      {!loading && error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <AlertCircle size={28} style={{ color: "#f87171" }} />
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
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.1}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#080b10" }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#161e2e" />

        <Controls
          showInteractive={false}
          onFitView={doFit}
          style={{
            background: "rgba(9,13,19,.92)", border: "1px solid #1e293b",
            borderRadius: 10, display: "flex", flexDirection: "column", gap: 2,
          }}
        />

        <MiniMap
          nodeColor={n => LAYER[n.data?.layer]?.border ?? "#334155"}
          maskColor="rgba(0,0,0,.8)"
          nodeStrokeWidth={0}
          style={{
            background: "#080b10", border: "1px solid #1e293b",
            borderRadius: 10, width: 150, height: 90,
          }}
        />

        {/* Top-left: repo info */}
        <Panel position="top-left">
          <div style={{ ...btnBase, cursor: "default", pointerEvents: "none", color: "#94a3b8" }}>
            <Layers size={14} style={{ color: "#38bdf8" }} />
            {meta && <span style={{ fontFamily: "ui-monospace,monospace", color: "#cbd5e1" }}>{meta.full_name}</span>}
            {nodeCount > 0 && (
              <><span style={{ color: "#1e293b" }}>·</span><span>{nodeCount} components</span></>
            )}
          </div>
        </Panel>

        {/* Top-right: actions */}
        <Panel position="top-right">
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={doFit} style={btnBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <Layers size={12} /> Fit view
            </button>
            <button onClick={onRegenerate} disabled={loading} style={{ ...btnBase, opacity: loading ? .4 : 1 }}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <RefreshCw size={12} /> Regenerate
            </button>
            <button onClick={exportPng} style={btnBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <Download size={12} /> Export PNG
            </button>
          </div>
        </Panel>

        {/* Bottom-left: legend */}
        <Panel position="bottom-left">
          <div style={{
            background: "rgba(9,13,19,.92)", backdropFilter: "blur(10px)",
            border: "1px solid #1e293b", borderRadius: 12, padding: "10px 14px",
            display: "flex", flexDirection: "column", gap: 7,
          }}>
            <span style={{
              fontSize: 9, color: "#334155", fontFamily: "ui-monospace,monospace",
              letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 2,
            }}>Layers</span>
            {Object.entries(LAYER).map(([name, cfg]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: cfg.border, boxShadow: `0 0 7px ${cfg.glow}`,
                }} />
                <span style={{
                  fontSize: 11, color: "#64748b",
                  fontFamily: "ui-monospace,monospace", textTransform: "capitalize",
                }}>{name}</span>
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
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <DiagramInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
