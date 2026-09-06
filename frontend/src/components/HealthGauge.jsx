import { useState, useEffect, useRef } from 'react'

/**
 * HealthGauge — Reusable SVG donut-style gauge for Business Health Score.
 *
 * Props:
 *   score  : number 0–100 (existing calculation, untouched)
 *   status : string  (existing health status label)
 *
 * Visual-only ranges (do NOT affect score calculation):
 *   80–100 → Healthy  (green)
 *   60–79  → Stable   (blue)
 *   40–59  → At Risk  (orange)
 *   0–39   → Critical (red)
 */

const RANGES = [
  { label: 'Healthy', min: 80, max: 100, color: '#48bb78', bg: '#c6f6d5' },
  { label: 'Stable', min: 60, max: 79, color: '#4299e1', bg: '#bee3f8' },
  { label: 'At Risk', min: 40, max: 59, color: '#ed8936', bg: '#feebc8' },
  { label: 'Critical', min: 0, max: 39, color: '#e53e3e', bg: '#fed7d7' },
]

function getRange(score) {
  return RANGES.find(r => score >= r.min && score <= r.max) || RANGES[3]
}

// SVG donut constants
const SIZE = 180
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER = SIZE / 2

function HealthGauge({ score, status }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE)
  const rafRef = useRef(null)
  const hasAnimated = useRef(false)

  const range = getRange(score)
  const targetOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  useEffect(() => {
    if (hasAnimated.current && Math.abs(animatedScore - score) < 1) return

    hasAnimated.current = true
    const duration = 900
    const startTime = performance.now()
    const startOffset = CIRCUMFERENCE

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const currentScore = Math.round((score) * eased)
      const currentOffset = startOffset + (targetOffset - startOffset) * eased

      setAnimatedScore(currentScore)
      setAnimatedOffset(currentOffset)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score])

  const ariaLabel = `Business Health Score: ${score} out of 100, status: ${status || range.label}`

  return (
    <div className="health-gauge-wrapper" role="img" aria-label={ariaLabel}>
      <div className="health-gauge-svg-container">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="health-gauge-svg"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={STROKE}
          />
          {/* Colored arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={range.color}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ transition: 'stroke 0.4s ease' }}
          />
          {/* Center score number */}
          <text
            x={CENTER}
            y={CENTER - 8}
            textAnchor="middle"
            dominantBaseline="central"
            className="health-gauge-score-text"
            fill={range.color}
            style={{ transition: 'fill 0.4s ease' }}
          >
            {animatedScore}
          </text>
          {/* "Health" label */}
          <text
            x={CENTER}
            y={CENTER + 18}
            textAnchor="middle"
            dominantBaseline="central"
            className="health-gauge-label-text"
            fill="#718096"
          >
            Health
          </text>
          {/* Status text below the donut */}
          <text
            x={CENTER}
            y={CENTER + 36}
            textAnchor="middle"
            dominantBaseline="central"
            className="health-gauge-status-text"
            fill={range.color}
            style={{ transition: 'fill 0.4s ease' }}
          >
            {status || range.label}
          </text>
        </svg>
      </div>

      {/* Screen-reader accessible fallback */}
      <span className="sr-only">
        Business Health Score: {score} out of 100. Status: {status || range.label}.
      </span>

      {/* Legend */}
      <div className="health-gauge-legend" role="list" aria-label="Health score ranges">
        {RANGES.map((r) => (
          <div
            key={r.label}
            className={`health-gauge-legend-item ${score >= r.min && score <= r.max ? 'active' : ''}`}
            role="listitem"
          >
            <span
              className="health-gauge-legend-dot"
              style={{ background: r.color }}
              aria-hidden="true"
            />
            <span className="health-gauge-legend-label">{r.label}</span>
            <span className="health-gauge-legend-range">{r.min}–{r.max}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HealthGauge
