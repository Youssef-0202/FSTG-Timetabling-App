
    interface CardProps{
        spanText: string;
        pText: string;
        h3Text: string;
        icon:React.ReactNode
    }

    export function Card({spanText, pText, h3Text,icon}: CardProps) {
        return (
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-all duration-300">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-all" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                 {icon}
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                {spanText}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-400">{pText}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{h3Text}</h3>
          </div>
        </div>
    )
}