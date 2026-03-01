export default function ShinyText({ text, className = "", speed = 3, disabled = false }) {
  return (
    <span
      className={`inline-block bg-clip-text ${disabled ? "" : "animate-shine"} ${className}`}
      style={{
        backgroundImage: "linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 60%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        animationDuration: `${speed}s`,
      }}
    >
      <style>{`
        @keyframes shine {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .animate-shine { animation: shine linear infinite; }
      `}</style>
      {text}
    </span>
  )
}
