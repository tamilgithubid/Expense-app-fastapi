import { cn } from "@/lib/utils"

export default function StarBorder({
  as: Component = "div",
  children,
  className = "",
  color = "white",
  speed = "6s",
  ...rest
}) {
  return (
    <Component
      className={cn("relative inline-block overflow-hidden rounded-xl p-[1px]", className)}
      style={rest.style}
      {...rest}
    >
      <style>{`
        @keyframes star-movement-bottom {
          0% { transform: translateX(0%); opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes star-movement-top {
          0% { transform: translateX(0%); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
      <div
        className="absolute top-[-25%] left-[-50%] w-[300%] h-[50%] opacity-70 z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animation: `star-movement-top ${speed} linear infinite`,
        }}
      />
      <div
        className="absolute bottom-[-25%] left-[-50%] w-[300%] h-[50%] opacity-70 z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animation: `star-movement-bottom ${speed} linear infinite`,
        }}
      />
      <div className="relative z-10 rounded-[11px]">
        {children}
      </div>
    </Component>
  )
}
