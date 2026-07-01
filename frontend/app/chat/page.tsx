"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./chat.module.css";

interface Message {
    id: string;
    sender: "user" | "bot";
    text: string;
    route?: string;
    sql?: string;
    durationMs?: number;
    timestamp: Date;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            sender: "bot",
            text: "Bonjour ! Je suis l'assistant intelligent DashTime. Comment puis-je vous aider aujourd'hui ? Je peux répondre à vos questions sur les emplois du temps, les enseignants, les salles ou vos maquettes pédagogiques.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSqlId, setShowSqlId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessageText = input.trim();
        setInput("");

        setMessages((prev) => [
            ...prev,
            {
                id: `user-${Date.now()}`,
                sender: "user",
                text: userMessageText,
                timestamp: new Date(),
            }
        ]);
        setLoading(true);

        try {
            // Extraire l'historique récent (4 derniers messages max en excluant le welcome)
            const recentHistory = messages
                .filter(m => m.id !== "welcome")
                .slice(-4)
                .map(m => ({
                    role: m.sender === "user" ? "user" : "assistant",
                    content: m.text
                }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessageText,
                    history: recentHistory
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `bot-${Date.now()}`,
                        sender: "bot",
                        text: data.answer,
                        route: data.route,
                        sql: data.sql,
                        durationMs: data.durationMs,
                        timestamp: new Date(),
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `bot-err-${Date.now()}`,
                        sender: "bot",
                        text: data.error || "Désolé, une erreur technique est survenue.",
                        timestamp: new Date(),
                    },
                ]);
            }
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `bot-err-${Date.now()}`,
                    sender: "bot",
                    text: "Impossible de joindre l'assistant DashTime. Assurez-vous que le serveur de base de données et l'API de chat sont lancés.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatMessageText = (text: string, isBot: boolean) => {
        if (!text) return "";

        const lines = text.split("\n");
        return lines.map((line, idx) => {
            let content: React.ReactNode = line;

            if (line.includes("**")) {
                const parts = line.split("**");
                content = parts.map((part, i) => (
                    i % 2 === 1 ? <strong key={i} className={isBot ? styles.boldBot : ""}>{part}</strong> : part
                ));
            }

            if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
                return (
                    <li key={idx}>
                        {line.trim().substring(2)}
                    </li>
                );
            }

            return (
                <p key={idx} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    {content}
                </p>
            );
        });
    };

    return (
        <div className={styles.chatWrapper}>
            <div className={styles.chatContainer}>

                {/* Header */}
                <div className={styles.chatHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.botIconWrapper}>
                            ✨
                        </div>
                        <div>
                            <h2 className={styles.headerTitle}>Assistant DashTime</h2>
                            <div className={styles.headerSubtitle}>
                                <span className={styles.pulseDot} />
                                Moteur SQL hybride connecté
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                        Groq Llama-3.3-70b
                    </div>
                </div>

                {/* Chat Feed */}
                <div className={styles.chatFeed}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`${styles.messageRow} ${msg.sender === "user" ? styles.user : styles.bot}`}
                        >
                            {msg.sender === "bot" && (
                                <div className={styles.botAvatar}>🤖</div>
                            )}

                            <div className={styles.messageContent}>
                                <div className={styles.bubble}>
                                    {msg.sender === "user" ? msg.text : formatMessageText(msg.text, true)}
                                </div>

                                {msg.sender === "bot" && (msg.route || msg.durationMs) && (
                                    <div className={styles.metaInfo}>
                                        {msg.route && (
                                            <span className={styles.routeBadge} style={{
                                                background: msg.route === 'SQL' ? '#e8f0fb' : '#fdf3e3',
                                                color: msg.route === 'SQL' ? 'var(--blue)' : 'var(--gold)',
                                                borderColor: msg.route === 'SQL' ? 'rgba(59,130,246,0.2)' : 'rgba(232,160,32,0.2)'
                                            }}>
                                                {msg.route}
                                            </span>
                                        )}

                                        {msg.durationMs && (
                                            <span>{msg.durationMs}ms</span>
                                        )}

                                        {msg.sql && (
                                            <button
                                                type="button"
                                                onClick={() => setShowSqlId(showSqlId === msg.id ? null : msg.id)}
                                                className={styles.sqlToggle}
                                            >
                                                {showSqlId === msg.id ? "Masquer SQL" : "Voir SQL"}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {msg.sender === "bot" && msg.sql && showSqlId === msg.id && (
                                    <div className={styles.sqlBlock}>
                                        {msg.sql}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className={`${styles.messageRow} ${styles.bot}`}>
                            <div className={styles.botAvatar}>🤖</div>
                            <div className={styles.messageContent}>
                                <div className={styles.bubble}>
                                    <div className={styles.typingIndicator}>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className={styles.inputFooter}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Posez une question sur le planning (ex: combien d'heures pour prof X ?)"
                        className={styles.chatInput}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className={styles.sendBtn}
                    >
                        Envoyer
                    </button>
                </form>
            </div>
        </div>
    );
}
