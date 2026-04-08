import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Trash2 } from "lucide-react";

const SUGGESTED = [
  "Give me a high-level overview of this codebase.",
  "What is the main entry point and how does the app start?",
  "What are the key modules and what does each do?",
  "How is authentication handled?",
  "Where should I look to add a new API endpoint?",
];

export default function ChatPanel({ owner, repo, token }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const r = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ owner, repo, message: text, history: messages }),
      });

      if (!r.ok) throw new Error((await r.json()).detail);

      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: full };
          return u;
        });
      }
    } catch (e) {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: `Error: ${e.message}` };
        return u;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    sendMessage(input.trim());
  }

  function clearChat() {
    setMessages([]);
    fetch(`/api/chat/context/${owner}/${repo}`, { method: "DELETE" });
  }

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)", maxHeight: "calc(100vh - 200px)",
    }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {messages.length === 0 && (
          <div style={{ paddingTop: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ color: "var(--text4)", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
              Ask anything about{" "}
              <span style={{ color: "var(--text2)", fontFamily: "monospace" }}>{owner}/{repo}</span>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 560, width: "100%" }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  textAlign: "left", fontSize: 12, color: "var(--text3)",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "10px 12px", cursor: "pointer", lineHeight: 1.5,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background="var(--surface2)"; e.currentTarget.style.borderColor="var(--border2)"; e.currentTarget.style.color="var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="var(--surface)"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text3)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", gap: 10,
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-start",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "var(--surface2)", border: "1px solid var(--border2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2,
              }}>
                <Bot size={13} color="var(--text2)" />
              </div>
            )}
            <div style={{
              maxWidth: 580, borderRadius: 12, padding: "10px 14px",
              fontSize: 13, lineHeight: 1.65,
              ...(msg.role === "user"
                ? {
                    background: "var(--text)", color: "var(--bg)",
                    borderTopRightRadius: 4,
                  }
                : {
                    background: "var(--surface)", border: "1px solid var(--border)",
                    color: "var(--text2)", borderTopLeftRadius: 4,
                  }
              ),
            }}>
              {msg.role === "assistant"
                ? <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none">{msg.content || "▍"}</ReactMarkdown>
                : msg.content
              }
            </div>
            {msg.role === "user" && (
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "var(--text)", display: "flex",
                alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2,
              }}>
                <User size={13} color="var(--bg)" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", background: "var(--bg)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            placeholder="Ask about the codebase… (Enter to send)"
            rows={2}
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border2)",
              borderRadius: 10, padding: "10px 14px", color: "var(--text)",
              fontSize: 13, resize: "none", outline: "none",
              fontFamily: "inherit", lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = "var(--text3)"}
            onBlur={e => e.target.style.borderColor = "var(--border2)"}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button type="submit" disabled={streaming || !input.trim()} style={{
              background: streaming || !input.trim() ? "var(--surface)" : "var(--text)",
              color: streaming || !input.trim() ? "var(--text4)" : "var(--bg)",
              border: "1px solid var(--border2)", borderRadius: 10,
              padding: 10, cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Send size={15} />
            </button>
            {messages.length > 0 && (
              <button type="button" onClick={clearChat} style={{
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: 10, padding: 10, cursor: "pointer",
                color: "var(--text5)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text2)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text5)"}
                title="Clear chat"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
