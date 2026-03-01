import { motion } from "framer-motion"

export default function AnimatedList({
  children,
  stagger = 0.05,
  direction = "up",
  className = "",
}) {
  const offsets = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
  }

  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={child?.key ?? i}
              initial={{ opacity: 0, ...offsets[direction] }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{
                duration: 0.4,
                delay: i * stagger,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </div>
  )
}
