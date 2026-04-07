import { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { nodeTypes, LAYER } from "./diagram/CustomNodes";
import { RefreshCw, Download, AlertCircle, Layers } from "lucide-react";

const NODE_W = 210;
const NODE_H = 80;

function layoutWithDagre(rawNodes, rawEdges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 90,
    ranksep: 110,
    marginx: 60,
    marginy: 60,
    align: "UL",
  });
  rawNodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  rawEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return rawNodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

function toFlowFormat(diagramData) {
  const valid = new Set(diagramData.nodes.map((n) => n.id));

  const nodes = diagramData.nodes.map((n) => ({
    id: n.id,
    type: "archNode",
    data: { label: n.label, layer: n.layer ?? "backend", sublabel: n.sublabel ?? "" },
    position: { x: 0, y: 0 },
  }));

  const edges = diagramData.edges
    .filter((e) => valid.has(e.source) && valid.has(e.target))
    .map((e, i) => {
      const srcLayer = diagramData.nodes.find((n) => n.id === e.source)?.layer ?? "backend";
      const color = LAYER[srcLayer]?.border ?? "#475569";
      return {
        id: e.id ?? `e_${e.source}_${e.target}_${i}`,
        source: e.source,
        target: e.target,
        label: e.label ?? "",
        animated: e.animated ?? false,
        type: "smoothstep",
        style: { stroke: color + "bb", strokeWidth: 1.8 },
        labelStyle: {
          fill: "#cbd5e1",
          fontSize: 10,
          fontFamily: "ui-monospace,monospace",
          fontWeight: 600,
        },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.88, rx: 5, ry: 5 },
        labelBgPadding: [4, 8],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color + "bb",
          width: 14,
          height: 14,
        },
      };
    });

  const layoutedNodes = layoutWithDagre(nodes, edges);
  return { nodes: layoutedNodes, edges };
}

const miniMapStyle = {
  background: "#0d1117",
  border: "1px solid #1e293b",
  borderRadius: "8px",
};

export default function DiagramPanel({ owner, repo }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.detail);
      }
      const data = await r.json();
      setMeta(data.meta);
      const { nodes: n, edges: e } = toFlowFormat(data.diagram);
      setNodes(n);
      setEdges(e);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => { fetchDiagram(); }, [fetchDiagram]);

  function exportSvg() {
    const svg = document.querySelector(".react-flow__renderer svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${owner}-${repo}-architecture.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ height: "calc(100vh - 200px)", background: "#0d1117", position: "relative" }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-950/80">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-500 mb-4" />
          <p className="text-gray-300 text-sm font-medium">Analysing repo &amp; building diagram…</p>
          <p className="text-gray-600 text-xs mt-1">Usually 20–40 seconds</p>
        </div>
      )}

      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchDiagram} className="mt-3 text-xs text-brand-400 hover:underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0d1117" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color="#1e293b"
          />
          <Controls
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              gap: "2px",
            }}
          />
          <MiniMap
            style={miniMapStyle}
            nodeColor={(n) => LAYER[n.data?.layer]?.border ?? "#475569"}
            maskColor="rgba(0,0,0,0.7)"
            nodeStrokeWidth={0}
          />

          {/* Top toolbar inside the canvas */}
          <Panel position="top-left">
            <div className="flex items-center gap-3 bg-gray-900/90 border border-gray-700 rounded-xl px-4 py-2 backdrop-blur-sm">
              <Layers className="w-4 h-4 text-brand-500" />
              {meta && (
                <span className="text-xs text-gray-400 font-mono">
                  {meta.full_name}
                </span>
              )}
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-500">{nodes.length} nodes</span>
            </div>
          </Panel>

          <Panel position="top-right">
            <div className="flex items-center gap-2">
              <button
                onClick={fetchDiagram}
                className="flex items-center gap-1.5 text-xs bg-gray-900/90 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 px-3 py-2 rounded-xl transition-colors backdrop-blur-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                onClick={exportSvg}
                className="flex items-center gap-1.5 text-xs bg-gray-900/90 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 px-3 py-2 rounded-xl transition-colors backdrop-blur-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </Panel>

          {/* Layer legend */}
          <Panel position="bottom-left">
            <div className="flex flex-col gap-1.5 bg-gray-900/90 border border-gray-700 rounded-xl px-3 py-2.5 backdrop-blur-sm">
              {Object.entries(LAYER).map(([name, cfg]) => (
                <div key={name} className="flex items-center gap-2">
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: cfg.border,
                      boxShadow: `0 0 6px ${cfg.glow}`,
                    }}
                  />
                  <span className="text-xs text-gray-400 capitalize font-mono">{name}</span>
                </div>
              ))}
            </div>
          </Panel>
        </ReactFlow>
      )}
    </div>
  );
}
