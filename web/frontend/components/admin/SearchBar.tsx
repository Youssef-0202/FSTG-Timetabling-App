import { Search } from "lucide-react";

type SearchBarProps = {
  placeholder?: string;
  onSearchChange?: (value: string) => void;
  filterOptions?: { label: string; value: string }[];
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
};

export default function SearchBar({
  placeholder = "Search...",
  onSearchChange,
  filterOptions,
  onFilterChange,
  filterLabel = "All Status",
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Filter Dropdown (optional) */}
      {filterOptions && filterOptions.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <select
            onChange={(e) => onFilterChange?.(e.target.value)}
            className="bg-black/20 border border-white/10 text-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            {/* CORRECTION : Ajout de bg-gray-900 pour le fond sombre */}
            <option value="" className="bg-gray-900 text-white">
              {filterLabel}
            </option>
            {filterOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-gray-900 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
