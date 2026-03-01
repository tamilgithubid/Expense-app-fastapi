import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function GridScan({
  gridSize = 30,
  gridColor = "rgba(99, 102, 241, 0.12)",
  scanColor = "rgba(99, 102, 241, 0.4)",
  scanWidth = 200,
  speed = 2,
  className = "",
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animationId
    let scanY = -scanWidth

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      // Draw grid
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 0.5

      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Draw scan line with gradient glow
      const gradient = ctx.createLinearGradient(0, scanY, 0, scanY + scanWidth)
      gradient.addColorStop(0, "transparent")
      gradient.addColorStop(0.4, scanColor)
      gradient.addColorStop(0.5, scanColor.replace(/[\d.]+\)$/, "0.8)"))
      gradient.addColorStop(0.6, scanColor)
      gradient.addColorStop(1, "transparent")

      ctx.fillStyle = gradient
      ctx.fillRect(0, scanY, w, scanWidth)

      // Highlight grid cells near scan line
      const scanCenter = scanY + scanWidth / 2
      for (let gy = 0; gy <= h; gy += gridSize) {
        const dist = Math.abs(gy - scanCenter)
        if (dist < scanWidth * 0.6) {
          const alpha = (1 - dist / (scanWidth * 0.6)) * 0.15
          ctx.fillStyle = scanColor.replace(/[\d.]+\)$/, `${alpha})`)
          for (let gx = 0; gx <= w; gx += gridSize) {
            ctx.fillRect(gx + 1, gy + 1, gridSize - 2, gridSize - 2)
          }
        }
      }

      // Draw crosshair dots at intersections near scan
      for (let gy = 0; gy <= h; gy += gridSize) {
        const dist = Math.abs(gy - scanCenter)
        if (dist < scanWidth * 0.5) {
          const alpha = (1 - dist / (scanWidth * 0.5)) * 0.8
          ctx.fillStyle = scanColor.replace(/[\d.]+\)$/, `${alpha})`)
          for (let gx = 0; gx <= w; gx += gridSize) {
            ctx.beginPath()
            ctx.arc(gx, gy, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      scanY += speed
      if (scanY > h + scanWidth) scanY = -scanWidth

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [gridSize, gridColor, scanColor, scanWidth, speed])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  )
}
