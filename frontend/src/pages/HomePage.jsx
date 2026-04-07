import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Map, MessageSquare, Zap } from "lucide-react";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function parseRepo(value) {
    // Accepts: "owner/repo" or full GitHub URL
    const clean = value.trim().replace(/\/$/, "");
    const urlMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
    const slashMatch = clean.match(/^([^/]+)\/([^/]+)$/);
    if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseRepo(input);
    if (!parsed) {
      setError('Enter a valid GitHub URL or "owner/repo"');
      return;
    }
    setError("");
    navigate(`/repo/${parsed.owner}/${parsed.repo}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center mb-12 max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Map className="w-10 h-10 text-brand-500" />
          <h1 className="text-4xl font-bold tracking-tight">RepoMap</h1>
        </div>
        <p className="text-xl text-gray-400 mt-2">
          Understand any GitHub repo in minutes, not days.
        </p>
        <p className="text-gray-500 mt-2 text-sm">
          Auto-generated architecture diagrams &amp; an AI assistant that knows
          every file.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="github.com/owner/repo  or  owner/repo"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-500 placeholder-gray-500"
          />
          <button
            type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-3 rounded-lg transition-colors text-sm"
          >
            Explore
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </form>

      {/* Feature cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          {
            icon: <GitBranch className="w-5 h-5 text-brand-500" />,
            title: "Architecture Diagram",
            desc: "AI-generated Mermaid diagram showing components, layers, and data flow.",
          },
          {
            icon: <MessageSquare className="w-5 h-5 text-brand-500" />,
            title: "Repo Chatbot",
            desc: "Ask anything about the codebase. Get answers grounded in the actual files.",
          },
          {
            icon: <Zap className="w-5 h-5 text-brand-500" />,
            title: "Fast Onboarding",
            desc: "Go from zero to productive in minutes, not weeks.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <div className="mb-2">{f.icon}</div>
            <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
