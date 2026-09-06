import { useState, useEffect, useRef, useMemo } from 'react'

/**
 * AnimatedNumber — Reusable component that smoothly animates a numeric value
 * from its previous state to a new target, using requestAnimationFrame.
 *
 * Props:
 *   value     : number          — the target numeric value (existing calculation)
 *   formatter : (number) => string — how to display the current interpolated value
 *   duration  : number (optional) — animation duration in ms (default 800)
 *   className : string (optional) — CSS class for the wrapping <span>
 *
 * Features:
 *   - Animates from previous value to new value (smooth transitions between demos)
 *   - Respects prefers-reduced-motion (instant display, no animation)
 *   - Does not re-trigger if value is unchanged
 *   - Uses ease-out cubic for professional feel
 */

// Detect reduced-motion preference once at module level
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function AnimatedNumber({ value, formatter, duration = 800, className }) {
  const target = parseFloat(value) || 0
  const [display, setDisplay] = useState(target)
  const rafRef = useRef(null)
  const prevTarget = useRef(target)
  const isFirstRender = useRef(true)

  // Stable formatter reference
  const formatFn = useMemo(() => formatter || ((v) => String(v)), [formatter])

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) {
      setDisplay(target)
      prevTarget.current = target
      return
    }

    // Skip if value hasn't actually changed
    if (Math.abs(prevTarget.current - target) < 0.001 && !isFirstRender.current) {
      return
    }

    isFirstRender.current = false
    const from = prevTarget.current
    const to = target
    prevTarget.current = target

    // For first render, start from 0 for a nice entrance effect
    const startVal = from === to ? 0 : from
    const startTime = performance.now()

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startVal + (to - startVal) * eased

      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(to)
      }
    }

    // Cancel any in-flight animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return (
    <span className={className} aria-live="polite">
      {formatFn(display)}
    </span>
  )
}

export default AnimatedNumber
