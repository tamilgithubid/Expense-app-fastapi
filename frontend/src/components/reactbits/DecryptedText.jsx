import { useState, useEffect, useRef, useCallback } from "react"
import { useInView } from "framer-motion"

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  className = "",
  parentClassName = "",
  revealDirection = "start",
}) {
  const [displayText, setDisplayText] = useState(text.replace(/[^ ]/g, " "))
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [hasDecrypted, setHasDecrypted] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const decrypt = useCallback(() => {
    if (isDecrypting || hasDecrypted) return
    setIsDecrypting(true)
    let iteration = 0
    const totalChars = text.replace(/ /g, "").length
    const interval = setInterval(() => {
      setDisplayText(() => {
        return text
          .split("")
          .map((char, index) => {
            if (char === " ") return " "
            const nonSpaceIndex = text.slice(0, index + 1).replace(/ /g, "").length - 1
            const revealThreshold =
              revealDirection === "start"
                ? (iteration / maxIterations) * totalChars
                : totalChars - (iteration / maxIterations) * totalChars
            const shouldReveal =
              revealDirection === "start"
                ? nonSpaceIndex < revealThreshold
                : nonSpaceIndex >= revealThreshold
            if (shouldReveal) return char
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join("")
      })
      iteration++
      if (iteration > maxIterations) {
        clearInterval(interval)
        setDisplayText(text)
        setIsDecrypting(false)
        setHasDecrypted(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, maxIterations, revealDirection, isDecrypting, hasDecrypted])

  useEffect(() => {
    if (isInView && !hasDecrypted) decrypt()
  }, [isInView, hasDecrypted, decrypt])

  return (
    <span ref={ref} className={parentClassName}>
      <span className={`font-mono ${className}`}>{displayText}</span>
    </span>
  )
}
