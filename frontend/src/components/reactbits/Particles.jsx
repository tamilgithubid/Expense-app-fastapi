import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function Particles({
  count = 80,
  colors = ["#6366f1", "#818cf8", "#a5b4fc", "#4f46e5"],
  connectDistance = 120,
  speed = 0.4,
  mouseRadius = 150,
  className = "",
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animationId
    let mouse = { x: -9999, y: -9999 }
    let particles = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const createParticles = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      }))
    }

    resize()
    createParticles()
    window.addEventListener("resize", () => { resize(); createParticles() })

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleMouseLeave = () => { mouse = { x: -9999, y: -9999 } }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      // Update & draw particles
      particles.forEach((p) => {
        p.pulse += 0.02
        p.x += p.vx
        p.y += p.vy

        // Mouse repulsion
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius * 0.8
          p.x += (dx / dist) * force
          p.y += (dy / dist) * force
        }

        // Wrap around edges
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        // Draw glow
        const pulseAlpha = 0.4 + Math.sin(p.pulse) * 0.2
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size + 1.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color.replace(")", `, ${pulseAlpha * 0.3})`)
          .replace("rgb", "rgba")
          .replace("#", "")
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size + 4)
        gradient.addColorStop(0, p.color + "60")
        gradient.addColorStop(1, p.color + "00")
        ctx.fillStyle = gradient
        ctx.fill()

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = pulseAlpha
        ctx.fill()
        ctx.globalAlpha = 1
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * 0.2
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)

            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
            grad.addColorStop(0, a.color + Math.round(alpha * 255).toString(16).padStart(2, "0"))
            grad.addColorStop(1, b.color + Math.round(alpha * 255).toString(16).padStart(2, "0"))
            ctx.strokeStyle = grad
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }

        // Mouse connections
        const a = particles[i]
        const mdx = a.x - mouse.x
        const mdy = a.y - mouse.y
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mdist < mouseRadius) {
          const alpha = (1 - mdist / mouseRadius) * 0.4
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.strokeStyle = a.color + Math.round(alpha * 255).toString(16).padStart(2, "0")
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [count, colors, connectDistance, speed, mouseRadius])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  )
}
