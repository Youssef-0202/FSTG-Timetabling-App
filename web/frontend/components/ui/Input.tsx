// components/ui/Input.tsx
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30",
          "focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none",
          error && "border-red-500/50",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}