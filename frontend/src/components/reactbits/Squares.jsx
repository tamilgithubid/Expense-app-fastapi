import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function Squares({
  speed = 0.3,
  squareSize = 40,
  borderColor = "rgba(59,130,246,0.12)",
  hoverFillColor = "rgba(59,130,246,0.06)",
  direction = "diagonal",
  className = "",
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animationId
    let offset = 0
    let mouse = { x: -1000, y: -1000 }

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener("resize", resize)

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", () => { mouse = { x: -1000, y: -1000 } })

    const draw = () => {
      offset += speed
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      const cols = Math.ceil(w / squareSize) + 2
      const rows = Math.ceil(h / squareSize) + 2

      let ox = 0, oy = 0
      if (direction === "diagonal") { ox = offset; oy = offset }
      else if (direction === "right") { ox = offset }
      else if (direction === "left") { ox = -offset }
      else if (direction === "up") { oy = -offset }
      else if (direction === "down") { oy = offset }

      const startX = -((ox % squareSize) + squareSize) % squareSize
      const startY = -((oy % squareSize) + squareSize) % squareSize

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * squareSize
          const y = startY + r * squareSize

          const dist = Math.hypot(mouse.x - (x + squareSize / 2), mouse.y - (y + squareSize / 2))
          if (dist < 120) {
            const alpha = Math.max(0, 1 - dist / 120)
            ctx.fillStyle = hoverFillColor.replace(/[\d.]+\)$/, `${alpha * 0.3})`)
            ctx.fillRect(x, y, squareSize, squareSize)
          }

          ctx.strokeStyle = borderColor
          ctx.lineWidth = 0.5
          ctx.strokeRect(x, y, squareSize, squareSize)
        }
      }

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [speed, squareSize, borderColor, hoverFillColor, direction])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  )
}
