import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Map, MessageSquare, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

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

      {/* GitHub login / go to repos */}
      <div className="flex flex-col items-center gap-3 mb-6 w-full max-w-xl">
        {user ? (
          <button
            onClick={() => navigate("/repos")}
            className="flex items-center gap-2 w-full justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium px-5 py-3 rounded-lg transition-colors text-sm"
          >
            <img src={user.avatar_url} alt={user.login} className="w-5 h-5 rounded-full" />
            View your repos (@{user.login})
          </button>
        ) : (
          <a
            href="/api/auth/login"
            className="flex items-center gap-2 w-full justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium px-5 py-3 rounded-lg transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            Sign in with GitHub
          </a>
        )}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs">or explore any public repo</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>
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
