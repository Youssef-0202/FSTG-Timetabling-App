import { cn } from "@/lib/utils";

// =====================================
// Types
// =====================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "glass" | "gradient" | "glow" | "bordered";
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

// =====================================
// Variants de style
// =====================================
const cardVariants = {
  default: "bg-white/5 border-white/10",
  glass: "bg-white/5 backdrop-blur-sm border-white/10",
  gradient: "bg-gradient-to-br from-white/5 to-white/0 border-white/10",
  glow: "bg-white/5 border-white/10 shadow-lg",
  bordered: "bg-white/5 border-white/20",
};

const paddingVariants = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

// =====================================
// Composant Card Principal
// =====================================
export function Card({
  children,
  className,
  padding = "md",
  variant = "default",
  hover = false,
  clickable = false,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base
        "rounded-2xl border transition-all duration-300",

        // Variants
        cardVariants[variant],

        // Padding
        paddingVariants[padding],

        // Hover effects
        hover &&
          "hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10",

        // Clickable
        clickable && "cursor-pointer active:scale-[0.98]",

        // Custom classes
        className
      )}
    >
      {children}
    </div>
  );
}

// =====================================
// Card avec effet de brillance
// =====================================
export function CardShine({
  children,
  className,
  ...props
}: Omit<CardProps, "variant">) {
  return (
    <div className="relative group">
      <Card
        {...props}
        variant="gradient"
        className={cn("overflow-hidden", className)}
      >
        {/* Effet de brillance au hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Contenu */}
        <div className="relative z-10">{children}</div>
      </Card>
    </div>
  );
}

// =====================================
// Card avec glow coloré
// =====================================
interface CardGlowProps extends CardProps {
  glowColor?:
    | "indigo"
    | "purple"
    | "pink"
    | "blue"
    | "green"
    | "yellow"
    | "red";
}

const glowColors = {
  indigo: "from-indigo-500/0 via-indigo-500/20 to-indigo-500/0",
  purple: "from-purple-500/0 via-purple-500/20 to-purple-500/0",
  pink: "from-pink-500/0 via-pink-500/20 to-pink-500/0",
  blue: "from-blue-500/0 via-blue-500/20 to-blue-500/0",
  green: "from-green-500/0 via-green-500/20 to-green-500/0",
  yellow: "from-yellow-500/0 via-yellow-500/20 to-yellow-500/0",
  red: "from-red-500/0 via-red-500/20 to-red-500/0",
};

export function CardGlow({
  children,
  glowColor = "indigo",
  className,
  ...props
}: CardGlowProps) {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          glowColors[glowColor]
        )}
      />

      {/* Card */}
      <Card {...props} variant="glass" className={cn("relative", className)}>
        {children}
      </Card>
    </div>
  );
}

// =====================================
// Card Stat (pour statistiques)
// =====================================
interface CardStatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: "indigo" | "purple" | "green" | "yellow" | "red" | "blue";
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

const statColors = {
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
    glow: "bg-indigo-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    glow: "bg-purple-500/20",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/20",
    glow: "bg-green-500/20",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
    glow: "bg-yellow-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    glow: "bg-red-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    glow: "bg-blue-500/20",
  },
};

export function CardStat({
  icon,
  label,
  value,
  color = "indigo",
  trend,
  className,
}: CardStatProps) {
  const colors = statColors[color];

  return (
    <Card
      variant="gradient"
      hover
      className={cn("group relative overflow-hidden", className)}
    >
      {/* Glow background */}
      <div
        className={cn(
          "absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full blur-2xl transition-all duration-500 group-hover:scale-110",
          colors.glow
        )}
      />

      {/* Content */}
      <div className="relative">
        <div
          className={cn("p-3 rounded-xl w-fit mb-3", colors.bg, colors.text)}
        >
          {icon}
        </div>
        <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-bold text-white">{value}</h3>
          {trend && (
            <span
              className={cn(
                "text-sm font-medium",
                trend.positive ? "text-green-400" : "text-red-400"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================
// Card Header (sous-composant)
// =====================================
interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// =====================================
// Card Footer (sous-composant)
// =====================================
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn("mt-6 pt-6 border-t border-white/10", className)}>
      {children}
    </div>
  );
}
