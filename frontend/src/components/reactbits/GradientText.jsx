import { cn } from "@/lib/utils"

export default function GradientText({
  children,
  className = "",
  colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#3b82f6"],
  speed = 4,
}) {
  const gradient = colors.join(", ")

  return (
    <span
      className={cn("inline-block font-bold bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradient})`,
        backgroundSize: "300% 100%",
        animation: `gradient-shift ${speed}s ease infinite`,
      }}
    >
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      {children}
    </span>
  )
}
