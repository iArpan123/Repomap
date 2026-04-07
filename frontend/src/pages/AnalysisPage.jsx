import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DiagramPanel from "../components/DiagramPanel";
import ChatPanel from "../components/ChatPanel";
import RepoHeader from "../components/RepoHeader";
import { Map, ArrowLeft } from "lucide-react";

export default function AnalysisPage() {
  const { owner, repo } = useParams();
  const [repoData, setRepoData] = useState(null);
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [repoError, setRepoError] = useState("");
  const [activeTab, setActiveTab] = useState("diagram");

  useEffect(() => {
    setLoadingRepo(true);
    setRepoError("");
    fetch("/api/repo/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.detail));
        return r.json();
      })
      .then(setRepoData)
      .catch((e) => setRepoError(String(e)))
      .finally(() => setLoadingRepo(false));
  }, [owner, repo]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Map className="w-5 h-5 text-brand-500" />
        <span className="font-semibold text-sm">RepoMap</span>
        <span className="text-gray-600 text-sm">/</span>
        <a
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline text-sm font-mono"
        >
          {owner}/{repo}
        </a>
      </header>

      {loadingRepo && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Fetching repository info…
        </div>
      )}

      {repoError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
          Error: {repoError}
        </div>
      )}

      {repoData && !loadingRepo && (
        <div className="flex-1 flex flex-col">
          <RepoHeader meta={repoData.meta} analysis={repoData.analysis} />

          {/* Tabs */}
          <div className="border-b border-gray-800 px-4 flex gap-6">
            {["diagram", "chat"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "diagram" ? "Architecture Diagram" : "Repo Chat"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "diagram" ? (
              <DiagramPanel owner={owner} repo={repo} />
            ) : (
              <ChatPanel owner={owner} repo={repo} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
