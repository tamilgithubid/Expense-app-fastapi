import { useEffect, useRef, useState } from "react"
import { useInView } from "framer-motion"

export default function CountUp({
  from = 0,
  to,
  duration = 1.5,
  decimals = 2,
  prefix = "",
  suffix = "",
  className = "",
}) {
  const [value, setValue] = useState(from)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const startTimeRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!isInView) return

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      setValue(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isInView, from, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  )
}
