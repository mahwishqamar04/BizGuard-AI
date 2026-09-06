import { useState, useEffect, useRef } from 'react'

/**
 * DashboardCharts — Lightweight SVG data visualizations for the BizGuard AI Dashboard.
 *
 * All three charts consume pre-calculated metrics; they never recalculate business logic.
 *
 * Components:
 *   SalesExpensesChart  — horizontal bar comparison of sales vs expenses
 *   ProfitMarginGauge   — semi-circular gauge showing profit margin %
 *   ExpenseRatioGauge   — circular progress ring showing expense ratio %
 */

// ─── Shared animation hook ────────────────────────────────────────────────────
function useAnimatedValue(target, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current && Math.abs(value - target) < 0.5) return
    hasAnimated.current = true
    const startTime = performance.now()

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(target * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

// ─── Helper: format currency ──────────────────────────────────────────────────
function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Math.round(n).toLocaleString()
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Sales vs Expenses — Horizontal Bar Chart
// ═══════════════════════════════════════════════════════════════════════════════
export function SalesExpensesChart({ sales, expenses }) {
  const maxVal = Math.max(sales || 0, expenses || 0, 1)
  const animatedSales = useAnimatedValue(sales || 0)
  const animatedExpenses = useAnimatedValue(expenses || 0)

  const salesPct = (animatedSales / maxVal) * 100
  const expensesPct = (animatedExpenses / maxVal) * 100

  const profit = (sales || 0) - (expenses || 0)
  const isProfitPositive = profit >= 0

  return (
    <div className="chart-card" role="img" aria-label={`Sales vs Expenses: Sales ${fmtCurrency(sales)}, Expenses ${fmtCurrency(expenses)}, Profit ${fmtCurrency(profit)}`}>
      <h3 className="chart-title">📊 Sales vs Expenses</h3>
      <div className="chart-body">
        {/* Sales Bar */}
        <div className="bar-row">
          <span className="bar-label">Sales</span>
          <div className="bar-track">
            <div
              className="bar-fill bar-sales"
              style={{ width: `${Math.max(salesPct, 2)}%` }}
              role="presentation"
            />
          </div>
          <span className="bar-value sales-value">{fmtCurrency(animatedSales)}</span>
        </div>

        {/* Expenses Bar */}
        <div className="bar-row">
          <span className="bar-label">Expenses</span>
          <div className="bar-track">
            <div
              className="bar-fill bar-expenses"
              style={{ width: `${Math.max(expensesPct, 2)}%` }}
              role="presentation"
            />
          </div>
          <span className="bar-value expenses-value">{fmtCurrency(animatedExpenses)}</span>
        </div>

        {/* Profit Summary */}
        <div className="bar-summary">
          <span className={`bar-summary-label ${isProfitPositive ? 'positive' : 'negative'}`}>
            {isProfitPositive ? '📈' : '📉'} Net Profit:
          </span>
          <span className={`bar-summary-value ${isProfitPositive ? 'positive' : 'negative'}`}>
            {fmtCurrency(profit)}
          </span>
        </div>
      </div>
      <span className="sr-only">
        Sales: {fmtCurrency(sales)}. Expenses: {fmtCurrency(expenses)}. Net Profit: {fmtCurrency(profit)}.
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Profit Margin — Semi-circular Gauge
// ═══════════════════════════════════════════════════════════════════════════════
const PM_SIZE = 160
const PM_STROKE = 12
const PM_RADIUS = (PM_SIZE - PM_STROKE) / 2
const PM_CX = PM_SIZE / 2
const PM_CY = PM_SIZE / 2 + 10
// Semi-circle arc length
const PM_ARC = Math.PI * PM_RADIUS
const PROFIT_MARGIN_TARGET = 20 // subtle reference line at 20%

function getMarginColor(pct) {
  if (pct >= 20) return { color: '#48bb78', bg: '#c6f6d5', label: 'Healthy' }
  if (pct >= 10) return { color: '#4299e1', bg: '#bee3f8', label: 'Moderate' }
  if (pct >= 0) return { color: '#ed8936', bg: '#feebc8', label: 'Low' }
  return { color: '#e53e3e', bg: '#fed7d7', label: 'Negative' }
}

export function ProfitMarginGauge({ profitMargin }) {
  const margin = parseFloat(profitMargin) || 0
  const animatedMargin = useAnimatedValue(margin, 900)

  // Clamp visual to -30..50 range for the gauge
  const gaugeMin = -30
  const gaugeMax = 50
  const gaugeRange = gaugeMax - gaugeMin
  const clampedMargin = Math.max(gaugeMin, Math.min(gaugeMax, margin))
  const clampedAnimated = Math.max(gaugeMin, Math.min(gaugeMax, animatedMargin))

  // Fraction of semi-circle (0..1)
  const fraction = (clampedAnimated - gaugeMin) / gaugeRange
  const dashOffset = PM_ARC - fraction * PM_ARC

  // Target line position
  const targetFraction = (PROFIT_MARGIN_TARGET - gaugeMin) / gaugeRange
  const targetAngle = Math.PI - targetFraction * Math.PI // radians from right
  const targetInnerR = PM_RADIUS - 10
  const targetOuterR = PM_RADIUS + 10
  const targetX1 = PM_CX + targetInnerR * Math.cos(targetAngle)
  const targetY1 = PM_CY - targetInnerR * Math.sin(targetAngle)
  const targetX2 = PM_CX + targetOuterR * Math.cos(targetAngle)
  const targetY2 = PM_CY - targetOuterR * Math.sin(targetAngle)

  const marginInfo = getMarginColor(margin)

  return (
    <div className="chart-card chart-gauge-card" role="img" aria-label={`Profit Margin: ${margin}%, status: ${marginInfo.label}`}>
      <h3 className="chart-title">📈 Profit Margin</h3>
      <div className="chart-gauge-body">
        <svg
          width={PM_SIZE}
          height={PM_SIZE / 2 + 30}
          viewBox={`0 0 ${PM_SIZE} ${PM_SIZE / 2 + 30}`}
          className="gauge-svg"
          aria-hidden="true"
        >
          {/* Background arc */}
          <path
            d={`M ${PM_CX - PM_RADIUS} ${PM_CY} A ${PM_RADIUS} ${PM_RADIUS} 0 0 1 ${PM_CX + PM_RADIUS} ${PM_CY}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={PM_STROKE}
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d={`M ${PM_CX - PM_RADIUS} ${PM_CY} A ${PM_RADIUS} ${PM_RADIUS} 0 0 1 ${PM_CX + PM_RADIUS} ${PM_CY}`}
            fill="none"
            stroke={marginInfo.color}
            strokeWidth={PM_STROKE}
            strokeDasharray={PM_ARC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.4s ease' }}
          />
          {/* Target reference line at 20% */}
          <line
            x1={targetX1}
            y1={targetY1}
            x2={targetX2}
            y2={targetY2}
            stroke="#a0aec0"
            strokeWidth={2}
            strokeDasharray="3,2"
            opacity={0.7}
          />
          <text
            x={targetX2 + 2}
            y={targetY2 - 4}
            fontSize="8"
            fill="#a0aec0"
            textAnchor="start"
          >
            20%
          </text>
          {/* Center value */}
          <text
            x={PM_CX}
            y={PM_CY - 8}
            textAnchor="middle"
            dominantBaseline="central"
            className="gauge-value-text"
            fill={marginInfo.color}
            style={{ transition: 'fill 0.4s ease' }}
          >
            {animatedMargin.toFixed(1)}%
          </text>
          <text
            x={PM_CX}
            y={PM_CY + 12}
            textAnchor="middle"
            dominantBaseline="central"
            className="gauge-label-text"
            fill="#718096"
          >
            {marginInfo.label}
          </text>
        </svg>
        <span className="sr-only">Profit Margin: {margin.toFixed(2)}%. {marginInfo.label}.</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Expense Ratio — Circular Progress Ring
// ═══════════════════════════════════════════════════════════════════════════════
const ER_SIZE = 140
const ER_STROKE = 11
const ER_RADIUS = (ER_SIZE - ER_STROKE) / 2
const ER_CIRCUMFERENCE = 2 * Math.PI * ER_RADIUS
const ER_CENTER = ER_SIZE / 2

function getExpenseRatioColor(ratio) {
  if (ratio <= 50) return { color: '#48bb78', label: 'Efficient' }
  if (ratio <= 70) return { color: '#4299e1', label: 'Moderate' }
  if (ratio <= 85) return { color: '#ed8936', label: 'High' }
  return { color: '#e53e3e', label: 'Critical' }
}

export function ExpenseRatioGauge({ expenseRatio }) {
  const ratio = parseFloat(expenseRatio) || 0
  const animatedRatio = useAnimatedValue(ratio, 900)

  const clampedRatio = Math.min(Math.max(animatedRatio, 0), 100)
  const targetOffset = ER_CIRCUMFERENCE - (clampedRatio / 100) * ER_CIRCUMFERENCE

  const ratioInfo = getExpenseRatioColor(ratio)

  return (
    <div className="chart-card chart-gauge-card" role="img" aria-label={`Expense Ratio: ${ratio}%, status: ${ratioInfo.label}`}>
      <h3 className="chart-title">💸 Expense Ratio</h3>
      <div className="chart-gauge-body">
        <svg
          width={ER_SIZE}
          height={ER_SIZE}
          viewBox={`0 0 ${ER_SIZE} ${ER_SIZE}`}
          className="gauge-svg"
          aria-hidden="true"
        >
          {/* Background ring */}
          <circle
            cx={ER_CENTER}
            cy={ER_CENTER}
            r={ER_RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={ER_STROKE}
          />
          {/* Colored arc */}
          <circle
            cx={ER_CENTER}
            cy={ER_CENTER}
            r={ER_RADIUS}
            fill="none"
            stroke={ratioInfo.color}
            strokeWidth={ER_STROKE}
            strokeDasharray={ER_CIRCUMFERENCE}
            strokeDashoffset={targetOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${ER_CENTER} ${ER_CENTER})`}
            style={{ transition: 'stroke 0.4s ease' }}
          />
          {/* Center value */}
          <text
            x={ER_CENTER}
            y={ER_CENTER - 6}
            textAnchor="middle"
            dominantBaseline="central"
            className="gauge-value-text"
            fill={ratioInfo.color}
            style={{ transition: 'fill 0.4s ease' }}
          >
            {animatedRatio.toFixed(0)}%
          </text>
          <text
            x={ER_CENTER}
            y={ER_CENTER + 14}
            textAnchor="middle"
            dominantBaseline="central"
            className="gauge-label-text"
            fill="#718096"
          >
            {ratioInfo.label}
          </text>
        </svg>
        <span className="sr-only">Expense Ratio: {ratio}%. {ratioInfo.label}.</span>
      </div>
    </div>
  )
}

export default { SalesExpensesChart, ProfitMarginGauge, ExpenseRatioGauge }
