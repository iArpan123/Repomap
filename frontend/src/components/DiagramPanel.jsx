import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { RefreshCw, Download } from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    background: "#0f172a",
    primaryColor: "#0ea5e9",
    primaryTextColor: "#f1f5f9",
    lineColor: "#475569",
    secondaryColor: "#1e293b",
    tertiaryColor: "#1e293b",
  },
});

export default function DiagramPanel({ owner, repo }) {
  const [mermaidCode, setMermaidCode] = useState("");
  const [svg, setSvg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const idRef = useRef(`mermaid-${Date.now()}`);

  async function fetchDiagram() {
    setLoading(true);
    setError("");
    setSvg("");
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
      setMermaidCode(data.mermaid);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDiagram();
  }, [owner, repo]);

  useEffect(() => {
    if (!mermaidCode) return;
    mermaid
      .render(idRef.current, mermaidCode)
      .then(({ svg }) => setSvg(svg))
      .catch((e) => setError("Diagram render error: " + e.message));
  }, [mermaidCode]);

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${owner}-${repo}-architecture.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-500">AI-generated architecture diagram</span>
        <div className="flex gap-2">
          <button
            onClick={fetchDiagram}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Regenerate
          </button>
          {svg && (
            <button
              onClick={downloadSvg}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              SVG
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        {loading && (
          <div className="text-gray-500 text-sm mt-20 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-brand-500" />
            Analysing repo and generating diagram…
            <br />
            <span className="text-xs">This may take 15–30 seconds.</span>
          </div>
        )}
        {error && !loading && (
          <div className="text-red-400 text-sm mt-20">Error: {error}</div>
        )}
        {svg && !loading && (
          <div
            className="mermaid-container w-full max-w-5xl"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      {/* Raw Mermaid code toggle */}
      {mermaidCode && !loading && (
        <details className="border-t border-gray-800 text-xs">
          <summary className="px-4 py-2 text-gray-500 cursor-pointer hover:text-gray-300">
            View Mermaid source
          </summary>
          <pre className="px-4 pb-4 text-gray-400 overflow-auto max-h-48 text-xs leading-relaxed">
            {mermaidCode}
          </pre>
        </details>
      )}
    </div>
  );
}
