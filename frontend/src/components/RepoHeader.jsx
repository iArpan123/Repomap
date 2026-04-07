import { Star, GitFork, Code2 } from "lucide-react";

export default function RepoHeader({ meta, analysis }) {
  return (
    <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
      <p className="text-gray-400 text-sm mb-3">
        {meta.description || "No description"}
      </p>
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Code2 className="w-3.5 h-3.5" />
          {meta.language || "Mixed"}
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" />
          {meta.stars.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="w-3.5 h-3.5" />
          {meta.forks.toLocaleString()}
        </span>
        <span>{analysis.total_files} files analysed</span>
        {meta.topics.map((t) => (
          <span
            key={t}
            className="bg-brand-900/40 text-brand-400 px-2 py-0.5 rounded-full"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
