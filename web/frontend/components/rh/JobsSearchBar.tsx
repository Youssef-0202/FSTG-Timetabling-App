"use client";

import { Search, MapPin, Filter, X } from "lucide-react";
import { useState } from "react";

type JobsSearchBarProps = {
  onSearch?: (query: string) => void;
  onLocationChange?: (location: string) => void;
  onFilterChange?: (filter: string) => void;
};

export function JobsSearchBar({
  onSearch,
  onLocationChange,
  onFilterChange,
}: JobsSearchBarProps) {
  // Local state pour gérer l'affichage des croix de suppression "X"
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSearchChange = (val: string) => {
    setQuery(val);
    onSearch?.(val);
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    onLocationChange?.(val);
  };

  const clearSearch = () => handleSearchChange("");
  const clearLocation = () => handleLocationChange("");

  return (
    <div className="w-full bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl shadow-xl shadow-black/20">
      {/* Search Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* --- 1. SEARCH INPUT --- */}
        <div className="relative md:col-span-5 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            placeholder="Search by job title, keywords..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:bg-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* --- 2. LOCATION INPUT --- */}
        <div className="relative md:col-span-4 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors">
            <MapPin className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={location}
            placeholder="City, country or remote..."
            onChange={(e) => handleLocationChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:bg-white/10 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
          />
          {location && (
            <button
              onClick={clearLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* --- 3. FILTER DROPDOWN --- */}
        <div className="relative md:col-span-3 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-400 transition-colors pointer-events-none">
            <Filter className="w-5 h-5" />
          </div>
          <select
            onChange={(e) => onFilterChange?.(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:bg-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer [&>option]:bg-[#18181b]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
          {/* Custom Arrow for Select */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
