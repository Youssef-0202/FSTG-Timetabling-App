"use client";

import React from "react";
import { Plus } from "lucide-react";

type HeaderProps = {
    title: string;
    description: string;
    buttonLabel?: string;
    buttonIcon?: React.ReactNode;
    onButtonClick?: () => void;
};

export default function Header({
    title,
    description,
    buttonLabel,
    buttonIcon,
    onButtonClick,
}: HeaderProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
            {/* Glassmorphism background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

            {/* Content */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-300 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm font-medium">{description}</p>
                </div>

                <div className="flex items-center gap-4">
                    {buttonLabel ? (
                        <button
                            onClick={onButtonClick}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            {buttonIcon || <Plus size={18} />}
                            <span>{buttonLabel}</span>
                        </button>
                    ) : (
                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-sm text-gray-400 flex items-center gap-2 font-mono">
                            <svg
                                className="w-4 h-4 text-indigo-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            {new Date().toLocaleDateString("fr-FR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
