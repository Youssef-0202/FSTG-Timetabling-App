"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    sender: "user" | "bot";
    text: string;
    route?: string;
    sql?: string;
    durationMs?: number;
}

const WELCOME: Message = {
    id: "welcome",
    sender: "bot",
    text: "Bonjour ! Je suis l'assistant DashTime. Posez-moi une question sur le planning, les enseignants ou les salles.",
};

export default function ChatBubble() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([WELCOME]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSqlId, setShowSqlId] = useState<string | null>(null);
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, loading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        const text = input.trim();
        setInput("");

        const userMsg: Message = { id: `u-${Date.now()}`, sender: "user", text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        const history = messages
            .filter(m => m.id !== "welcome")
            .slice(-4)
            .map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, {
                id: `b-${Date.now()}`,
                sender: "bot",
                text: res.ok ? data.answer : (data.error || "Une erreur est survenue."),
                route: data.route,
                sql: data.sql,
                durationMs: data.durationMs,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: `err-${Date.now()}`, sender: "bot",
                text: "Impossible de joindre le serveur de l'assistant.",
            }]);
        } finally {
            setLoading(false);
        }
    };

    const renderText = (text: string) =>
        text.split("\n").map((line, i) => {
            if (line.trim().startsWith("* ") || line.trim().startsWith("- "))
                return <li key={i} style={{ marginLeft: 16, marginBottom: 2 }}>{line.trim().substring(2)}</li>;
            if (line.includes("**")) {
                const parts = line.split("**");
                return <p key={i} style={{ margin: "3px 0" }}>{parts.map((p, j) =>
                    j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
            }
            return line.trim() ? <p key={i} style={{ margin: "3px 0" }}>{line}</p> : null;
        });

    return (
        <>
            {/* ── Backdrop flouté ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setOpen(false)}
                        style={{
                            position: "fixed", inset: 0, zIndex: 1099,
                            background: "rgba(11,31,75,0.35)",
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)",
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Panneau Chat ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        style={{
                            position: "fixed", bottom: 90, right: 24,
                            width: 420, height: 580, zIndex: 1100,
                            background: "#fff",
                            borderRadius: 24,
                            boxShadow: "0 24px 60px rgba(11,31,75,0.22)",
                            border: "1px solid rgba(203,213,225,0.6)",
                            display: "flex", flexDirection: "column", overflow: "hidden",
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: "14px 18px",
                            background: "linear-gradient(135deg,#0b1f4b 0%,#1e3a8a 100%)",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 12,
                                    background: "rgba(255,255,255,0.12)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1.1rem",
                                }}>✨</div>
                                <div>
                                    <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", fontFamily: "Outfit,sans-serif" }}>
                                        Assistant DashTime
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a9e7a", display: "inline-block", animation: "pulse 2s infinite" }} />
                                        <span style={{ color: "#1a9e7a", fontSize: "0.7rem", fontWeight: 700 }}>Moteur SQL hybride</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} style={{
                                background: "rgba(255,255,255,0.12)", border: "none",
                                color: "#fff", borderRadius: 8, padding: "6px 10px",
                                cursor: "pointer", fontSize: "1rem", lineHeight: 1,
                            }}>✕</button>
                        </div>

                        {/* Feed */}
                        <div ref={feedRef} style={{
                            flex: 1, overflowY: "auto", padding: "16px 14px",
                            display: "flex", flexDirection: "column", gap: 14,
                            background: "#f8fafc",
                        }}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{
                                    display: "flex", flexDirection: "column",
                                    alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                                    gap: 4,
                                }}>
                                    <div style={{
                                        maxWidth: "85%",
                                        background: msg.sender === "user"
                                            ? "linear-gradient(135deg,#0b1f4b,#1e3a8a)"
                                            : "#fff",
                                        color: msg.sender === "user" ? "#fff" : "#0f172a",
                                        borderRadius: msg.sender === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                        padding: "10px 14px",
                                        fontSize: "0.85rem", lineHeight: 1.5,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                        border: msg.sender === "bot" ? "1px solid rgba(203,213,225,0.5)" : "none",
                                    }}>
                                        {msg.sender === "user" ? msg.text : renderText(msg.text)}
                                    </div>
                                    {msg.sender === "bot" && (msg.route || msg.sql) && (
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 4, fontSize: "0.62rem", fontFamily: "monospace", color: "#64748b" }}>
                                            {msg.route && (
                                                <span style={{
                                                    padding: "1px 7px", borderRadius: 100,
                                                    background: msg.route === "SQL" ? "#e8f0fb" : "#fdf3e3",
                                                    color: msg.route === "SQL" ? "#3b82f6" : "#e8a020",
                                                    border: `1px solid ${msg.route === "SQL" ? "rgba(59,130,246,0.2)" : "rgba(232,160,32,0.2)"}`,
                                                    fontWeight: 800, textTransform: "uppercase",
                                                }}>{msg.route}</span>
                                            )}
                                            {msg.durationMs && <span>{msg.durationMs}ms</span>}
                                            {msg.sql && (
                                                <button onClick={() => setShowSqlId(showSqlId === msg.id ? null : msg.id)}
                                                    style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem", textDecoration: "underline" }}>
                                                    {showSqlId === msg.id ? "Masquer SQL" : "Voir SQL"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {msg.sql && showSqlId === msg.id && (
                                        <div style={{
                                            maxWidth: "90%", background: "#0f172a", borderRadius: 10,
                                            padding: "8px 12px", fontFamily: "monospace", fontSize: "0.7rem",
                                            color: "#7dd3fc", overflowX: "auto",
                                            border: "1px solid #1e293b",
                                        }}>{msg.sql}</div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <div style={{
                                        background: "#fff", border: "1px solid rgba(203,213,225,0.5)",
                                        borderRadius: "18px 18px 18px 4px", padding: "10px 16px",
                                        display: "flex", gap: 4, alignItems: "center",
                                    }}>
                                        {[0, 0.16, 0.32].map((d, i) => (
                                            <span key={i} style={{
                                                width: 6, height: 6, borderRadius: "50%",
                                                background: "#0b1f4b", display: "inline-block",
                                                animation: `typingBounce 1.4s ${d}s infinite ease-in-out both`,
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} style={{
                            padding: "12px 14px",
                            borderTop: "1px solid rgba(203,213,225,0.5)",
                            background: "#fff",
                            display: "flex", gap: 8,
                        }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Posez une question..."
                                disabled={loading}
                                style={{
                                    flex: 1, padding: "10px 14px", borderRadius: 14,
                                    border: "1.5px solid rgba(203,213,225,0.6)",
                                    fontSize: "0.85rem", outline: "none",
                                    background: "#f8fafc", color: "#0f172a",
                                    fontFamily: "Inter,sans-serif",
                                    transition: "border-color 0.2s",
                                }}
                                onFocus={e => (e.target.style.borderColor = "#0b1f4b")}
                                onBlur={e => (e.target.style.borderColor = "rgba(203,213,225,0.6)")}
                            />
                            <button type="submit" disabled={loading || !input.trim()} style={{
                                background: loading || !input.trim() ? "#94a3b8" : "linear-gradient(135deg,#0b1f4b,#1e3a8a)",
                                border: "none", color: "#fff", borderRadius: 14,
                                padding: "0 18px", fontWeight: 700, fontSize: "0.82rem",
                                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                                fontFamily: "Outfit,sans-serif",
                            }}>
                                ↑
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Bubble Flottante ── */}
            <motion.button
                onClick={() => setOpen(o => !o)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.94 }}
                style={{
                    position: "fixed", bottom: 24, right: 24,
                    zIndex: 1101,
                    width: 58, height: 58, borderRadius: "50%",
                    background: open
                        ? "linear-gradient(135deg,#1e3a8a,#0b1f4b)"
                        : "linear-gradient(135deg,#e8a020,#f59e0b)",
                    border: "none", cursor: "pointer",
                    boxShadow: open
                        ? "0 8px 24px rgba(11,31,75,0.35)"
                        : "0 8px 24px rgba(232,160,32,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.4rem",
                    transition: "background 0.3s, box-shadow 0.3s",
                }}
                title="Assistant DashTime IA"
            >
                <motion.span
                    key={open ? "close" : "open"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {open ? "✕" : "✨"}
                </motion.span>
            </motion.button>

            <style>{`
                @keyframes typingBounce {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </>
    );
}
