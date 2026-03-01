import { useRef, useCallback } from "react"

export default function ClickSpark({
  children,
  sparkColor = "#3b82f6",
  sparkCount = 8,
  sparkSize = 10,
  duration = 500,
}) {
  const containerRef = useRef(null)

  const createSpark = useCallback(
    (e) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement("div")
        const angle = (360 / sparkCount) * i
        const velocity = 30 + Math.random() * 40
        const rad = (angle * Math.PI) / 180
        const tx = Math.cos(rad) * velocity
        const ty = Math.sin(rad) * velocity

        Object.assign(spark.style, {
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: `${sparkSize}px`,
          height: `${sparkSize}px`,
          borderRadius: "50%",
          backgroundColor: sparkColor,
          pointerEvents: "none",
          zIndex: 9999,
          transition: `all ${duration}ms ease-out`,
          transform: "translate(-50%, -50%) scale(1)",
          opacity: "1",
        })

        container.appendChild(spark)

        requestAnimationFrame(() => {
          spark.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`
          spark.style.opacity = "0"
        })

        setTimeout(() => spark.remove(), duration)
      }
    },
    [sparkColor, sparkCount, sparkSize, duration]
  )

  return (
    <div
      ref={containerRef}
      onClick={createSpark}
      className="relative inline-block"
      style={{ position: "relative", overflow: "visible" }}
    >
      {children}
    </div>
  )
}
