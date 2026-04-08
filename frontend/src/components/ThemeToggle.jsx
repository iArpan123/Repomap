import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ style = {} }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 36, height: 20, borderRadius: 99,
        background: isDark ? "var(--border3)" : "var(--border3)",
        border: "1px solid var(--border2)",
        position: "relative", cursor: "pointer",
        flexShrink: 0, padding: 0,
        ...style,
      }}
    >
      {/* Track label icons */}
      <span style={{
        position: "absolute", left: 4, top: "50%",
        transform: "translateY(-50%)", fontSize: 9,
        opacity: isDark ? 0 : 1, transition: "opacity 0.3s",
        pointerEvents: "none",
      }}>☀️</span>
      <span style={{
        position: "absolute", right: 4, top: "50%",
        transform: "translateY(-50%)", fontSize: 9,
        opacity: isDark ? 1 : 0, transition: "opacity 0.3s",
        pointerEvents: "none",
      }}>🌙</span>

      {/* Thumb */}
      <span style={{
        position: "absolute", top: 2,
        left: isDark ? "calc(100% - 16px)" : 2,
        width: 14, height: 14, borderRadius: "50%",
        background: "var(--text)",
        transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
        display: "block",
      }} />
    </button>
  );
}
