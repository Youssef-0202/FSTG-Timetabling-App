import { Search, Filter } from "lucide-react";

type SearchBarProps = {
  onSearch: (query: string, minYears?: number) => void;
  placeholder?: string;
};

export default function SearchBar({ onSearch, placeholder }: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onSearch(e.target.value, undefined)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/20 border border-white/10 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          onChange={(e) => onSearch("", Number(e.target.value))}
          className="bg-black/20 border border-white/10 text-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-rose-500/50"
        >
          <option value="0" className="bg-gray-900">
            Any Experience
          </option>
          <option value="2" className="bg-gray-900">
            2+ Years
          </option>
          <option value="5" className="bg-gray-900">
            5+ Years
          </option>
          <option value="10" className="bg-gray-900">
            10+ Years
          </option>
        </select>
      </div>
    </div>
  );
}
