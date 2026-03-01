import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function Aurora({
  colorStops = ["#3b82f6", "#8b5cf6", "#06b6d4"],
  speed = 1,
  blend = 0.5,
  className = "",
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animationId
    let time = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      time += 0.003 * speed
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = blend

      colorStops.forEach((color, i) => {
        const offset = (i / colorStops.length) * Math.PI * 2
        const x = width * (0.3 + 0.4 * Math.sin(time + offset))
        const y = height * (0.3 + 0.4 * Math.cos(time * 0.7 + offset))
        const radius = Math.max(width, height) * (0.4 + 0.1 * Math.sin(time * 0.5 + i))

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, color + "80")
        gradient.addColorStop(0.5, color + "30")
        gradient.addColorStop(1, "transparent")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      })

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [colorStops, speed, blend])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
      style={{ filter: "blur(60px)" }}
    />
  )
}
