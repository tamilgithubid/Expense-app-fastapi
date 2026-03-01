import { useRef, useEffect, useState } from "react"
import { motion, useInView } from "framer-motion"

export default function BlurText({
  text = "",
  delay = 100,
  className = "",
  animateBy = "words",
  direction = "top",
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const elements = animateBy === "words" ? text.split(" ") : text.split("")

  const directionOffset = direction === "top" ? -20 : 20

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {elements.map((el, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(12px)", y: directionOffset }}
          animate={isInView ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
          transition={{
            duration: 0.5,
            delay: i * (delay / 1000),
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block"
        >
          {el}
          {animateBy === "words" && "\u00A0"}
        </motion.span>
      ))}
    </span>
  )
}
