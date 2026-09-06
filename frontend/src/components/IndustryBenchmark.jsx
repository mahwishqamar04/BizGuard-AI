import { useMemo } from 'react'
import { getBenchmarkInterpretation } from '../config/industryBenchmarks'

/**
 * IndustryBenchmark — Dashboard section comparing business metrics against
 * illustrative industry reference ranges.
 *
 * Props:
 *   profitMargin : number  — existing calculated profit margin (%)
 *   expenseRatio : number  — existing calculated expense ratio (%)
 *   category     : string  — business category/industry
 *
 * This component does NOT calculate or modify any business metrics.
 * It only reads the existing values and compares them against static benchmarks.
 */

// Status badge config
const STATUS_CONFIG = {
  below: { label: 'Below Reference', color: '#e53e3e', bg: '#fff5f5', icon: '🔴' },
  within: { label: 'Within Reference', color: '#48bb78', bg: '#f0fff4', icon: '🟢' },
  above: { label: 'Above Reference', color: '#4299e1', bg: '#ebf8ff', icon: '🔵' },
  ok: { label: 'Acceptable', color: '#48bb78', bg: '#f0fff4', icon: '🟢' },
  warning: { label: 'Approaching Threshold', color: '#ed8936', bg: '#fffaf0', icon: '🟠' },
  critical: { label: 'Above Threshold', color: '#e53e3e', bg: '#fff5f5', icon: '🔴' },
}

// SVG bar chart dimensions
const BAR_WIDTH = 280
const BAR_HEIGHT = 20
const BAR_Y = 10
const RANGE_LABEL_HEIGHT = 50

function BenchmarkBar({ value, min, max, scaleMax, unit = '%', label }) {
  // Calculate positions on the bar
  const valPct = Math.min(Math.max((value / scaleMax) * 100, 0), 100)
  const minPct = Math.min(Math.max((min / scaleMax) * 100, 0), 100)
  const maxPct = Math.min(Math.max((max / scaleMax) * 100, 0), 100)

  const valX = (valPct / 100) * BAR_WIDTH
  const rangeX1 = (minPct / 100) * BAR_WIDTH
  const rangeX2 = (maxPct / 100) * BAR_WIDTH

  return (
    <div className="benchmark-bar-container">
      <div className="benchmark-bar-label">{label}</div>
      <svg
        width="100%"
        viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT + RANGE_LABEL_HEIGHT}`}
        className="benchmark-bar-svg"
        aria-hidden="true"
        preserveAspectRatio="xMinYMin meet"
      >
        {/* Background track */}
        <rect x="0" y={BAR_Y} width={BAR_WIDTH} height={BAR_HEIGHT} rx="4" fill="#edf2f7" />

        {/* Reference range (green zone) */}
        <rect
          x={rangeX1}
          y={BAR_Y}
          width={Math.max(rangeX2 - rangeX1, 2)}
          height={BAR_HEIGHT}
          rx="4"
          fill="#c6f6d5"
          opacity={0.7}
        />

        {/* Current value marker */}
        <line
          x1={valX}
          y1={BAR_Y - 3}
          x2={valX}
          y2={BAR_Y + BAR_HEIGHT + 3}
          stroke="#2d3748"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Range labels below bar */}
        <text x={rangeX1} y={BAR_Y + BAR_HEIGHT + 16} fontSize="9" fill="#718096" textAnchor="middle">
          {min}{unit}
        </text>
        <text x={rangeX2} y={BAR_Y + BAR_HEIGHT + 16} fontSize="9" fill="#718096" textAnchor="middle">
          {max}{unit}
        </text>

        {/* Value label */}
        <text
          x={valX}
          y={BAR_Y + BAR_HEIGHT + 30}
          fontSize="10"
          fontWeight="700"
          fill="#2d3748"
          textAnchor="middle"
        >
          You: {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </text>
      </svg>
      <span className="sr-only">
        {label}: Your value is {typeof value === 'number' ? value.toFixed(1) : value}{unit}.
        Reference range: {min}{unit} to {max}{unit}.
      </span>
    </div>
  )
}

function BenchmarkExpenseBar({ value, threshold, scaleMax, unit = '%' }) {
  const valPct = Math.min(Math.max((value / scaleMax) * 100, 0), 100)
  const thresholdPct = Math.min(Math.max((threshold / scaleMax) * 100, 0), 100)
  const valX = (valPct / 100) * BAR_WIDTH
  const threshX = (thresholdPct / 100) * BAR_WIDTH

  return (
    <div className="benchmark-bar-container">
      <div className="benchmark-bar-label">Expense Ratio</div>
      <svg
        width="100%"
        viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT + RANGE_LABEL_HEIGHT}`}
        className="benchmark-bar-svg"
        aria-hidden="true"
        preserveAspectRatio="xMinYMin meet"
      >
        {/* Background track */}
        <rect x="0" y={BAR_Y} width={BAR_WIDTH} height={BAR_HEIGHT} rx="4" fill="#edf2f7" />

        {/* Safe zone (before threshold) */}
        <rect x="0" y={BAR_Y} width={threshX} height={BAR_HEIGHT} rx="4" fill="#c6f6d5" opacity={0.5} />

        {/* Danger zone (after threshold) */}
        <rect
          x={threshX}
          y={BAR_Y}
          width={BAR_WIDTH - threshX}
          height={BAR_HEIGHT}
          rx="4"
          fill="#fed7d7"
          opacity={0.5}
        />

        {/* Threshold line */}
        <line
          x1={threshX}
          y1={BAR_Y - 3}
          x2={threshX}
          y2={BAR_Y + BAR_HEIGHT + 3}
          stroke="#ed8936"
          strokeWidth="2"
          strokeDasharray="4,2"
        />

        {/* Current value marker */}
        <line
          x1={valX}
          y1={BAR_Y - 3}
          x2={valX}
          y2={BAR_Y + BAR_HEIGHT + 3}
          stroke="#2d3748"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Labels */}
        <text x={threshX} y={BAR_Y + BAR_HEIGHT + 16} fontSize="9" fill="#ed8936" textAnchor="middle">
          Threshold: {threshold}{unit}
        </text>
        <text
          x={valX}
          y={BAR_Y + BAR_HEIGHT + 30}
          fontSize="10"
          fontWeight="700"
          fill="#2d3748"
          textAnchor="middle"
        >
          You: {typeof value === 'number' ? value.toFixed(0) : value}{unit}
        </text>
      </svg>
      <span className="sr-only">
        Expense Ratio: Your value is {typeof value === 'number' ? value.toFixed(0) : value}{unit}.
        Warning threshold: {threshold}{unit}.
      </span>
    </div>
  )
}

function IndustryBenchmark({ profitMargin, expenseRatio, category }) {
  const interpretation = useMemo(
    () => getBenchmarkInterpretation(profitMargin, expenseRatio, category),
    [profitMargin, expenseRatio, category]
  )

  const { marginText, expenseText, marginStatus, expenseStatus, benchmark } = interpretation
  const marginConfig = STATUS_CONFIG[marginStatus]
  const expenseConfig = STATUS_CONFIG[expenseStatus]

  const margin = parseFloat(profitMargin) || 0
  const ratio = parseFloat(expenseRatio) || 0
  const [minMargin, maxMargin] = benchmark.profitMarginRange

  // Scale for the bars: use a reasonable max
  const marginScaleMax = Math.max(maxMargin * 1.5, margin * 1.2, 30)
  const expenseScaleMax = Math.max(benchmark.expenseRatioWarning + 15, ratio + 5, 100)

  return (
    <div className="benchmark-section" role="region" aria-label="Industry Benchmark Comparison">
      <div className="benchmark-header">
        <div>
          <h2>🏭 Industry Benchmark</h2>
          <p className="benchmark-subtitle">
            Illustrative reference comparison for <strong>{benchmark.label}</strong>
          </p>
        </div>
        <span className="benchmark-badge">Reference Benchmark</span>
      </div>

      {/* Status Summary */}
      <div className="benchmark-status-row">
        <div className="benchmark-status-item" style={{ background: marginConfig.bg, borderColor: marginConfig.color }}>
          <span className="benchmark-status-icon" aria-hidden="true">{marginConfig.icon}</span>
          <div>
            <div className="benchmark-status-label">Profit Margin</div>
            <div className="benchmark-status-value" style={{ color: marginConfig.color }}>
              {marginConfig.label}
            </div>
          </div>
        </div>
        <div className="benchmark-status-item" style={{ background: expenseConfig.bg, borderColor: expenseConfig.color }}>
          <span className="benchmark-status-icon" aria-hidden="true">{expenseConfig.icon}</span>
          <div>
            <div className="benchmark-status-label">Expense Ratio</div>
            <div className="benchmark-status-value" style={{ color: expenseConfig.color }}>
              {expenseConfig.label}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Comparison Bars */}
      <div className="benchmark-bars">
        <BenchmarkBar
          value={margin}
          min={minMargin}
          max={maxMargin}
          scaleMax={marginScaleMax}
          label="Profit Margin"
        />
        <BenchmarkExpenseBar
          value={ratio}
          threshold={benchmark.expenseRatioWarning}
          scaleMax={expenseScaleMax}
        />
      </div>

      {/* Interpretation Text */}
      <div className="benchmark-interpretation">
        <p>{marginText}</p>
        <p>{expenseText}</p>
      </div>

      {/* Disclaimer */}
      <p className="benchmark-disclaimer">
        ⚠️ These are illustrative reference ranges for demonstration purposes only.
        They do not represent official industry statistics.
      </p>
    </div>
  )
}

export default IndustryBenchmark
