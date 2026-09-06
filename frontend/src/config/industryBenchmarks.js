/**
 * Industry Benchmark Reference Data
 *
 * Illustrative reference ranges for common business industries.
 * These are NOT official statistics — they are simplified benchmarks
 * for demonstration and educational purposes only.
 *
 * Each profile defines:
 *   - profitMarginRange: [min%, max%] typical reference range
 *   - expenseRatioWarning: threshold above which expenses are considered high
 *   - description: short label for the industry
 */

const INDUSTRY_BENCHMARKS = {
  'Retail': {
    label: 'Retail',
    profitMarginRange: [5, 10],
    expenseRatioWarning: 90,
    description: 'Typical retail business',
  },
  'Restaurant / Food': {
    label: 'Restaurant / Food',
    profitMarginRange: [5, 12],
    expenseRatioWarning: 90,
    description: 'Restaurant or food service business',
  },
  'Technology': {
    label: 'Technology',
    profitMarginRange: [15, 25],
    expenseRatioWarning: 80,
    description: 'Technology or software business',
  },
  'Services': {
    label: 'Services',
    profitMarginRange: [10, 20],
    expenseRatioWarning: 85,
    description: 'Professional services business',
  },
  'Manufacturing': {
    label: 'Manufacturing',
    profitMarginRange: [8, 15],
    expenseRatioWarning: 90,
    description: 'Manufacturing or production business',
  },
}

// Default benchmark when category is unknown or "Other"
const DEFAULT_BENCHMARK = INDUSTRY_BENCHMARKS['Retail']

/**
 * Get the benchmark profile for a given industry/category.
 * Falls back to Retail if the category is not recognized.
 */
export function getBenchmark(category) {
  if (!category || typeof category !== 'string') return DEFAULT_BENCHMARK
  return INDUSTRY_BENCHMARKS[category] || DEFAULT_BENCHMARK
}

/**
 * Compare a profit margin against the benchmark range.
 * Returns: 'below' | 'within' | 'above'
 */
export function compareMargin(margin, benchmark) {
  const m = parseFloat(margin) || 0
  const [min, max] = benchmark.profitMarginRange
  if (m < min) return 'below'
  if (m > max) return 'above'
  return 'within'
}

/**
 * Compare an expense ratio against the benchmark warning threshold.
 * Returns: 'ok' | 'warning' | 'critical'
 */
export function compareExpenseRatio(ratio, benchmark) {
  const r = parseFloat(ratio) || 0
  const threshold = benchmark.expenseRatioWarning
  if (r >= threshold + 10) return 'critical'
  if (r >= threshold) return 'warning'
  return 'ok'
}

/**
 * Generate a human-readable interpretation of the benchmark comparison.
 */
export function getBenchmarkInterpretation(profitMargin, expenseRatio, category) {
  const benchmark = getBenchmark(category)
  const marginStatus = compareMargin(profitMargin, benchmark)
  const expenseStatus = compareExpenseRatio(expenseRatio, benchmark)
  const [min, max] = benchmark.profitMarginRange

  const margin = parseFloat(profitMargin) || 0
  const ratio = parseFloat(expenseRatio) || 0

  let marginText = ''
  if (marginStatus === 'below') {
    marginText = `Your ${margin.toFixed(1)}% margin is below the reference range (${min}%–${max}%) for ${benchmark.label}.`
  } else if (marginStatus === 'above') {
    marginText = `Your ${margin.toFixed(1)}% margin is above the reference range (${min}%–${max}%) for ${benchmark.label} — strong performance.`
  } else {
    marginText = `Your ${margin.toFixed(1)}% margin is within the typical reference range (${min}%–${max}%) for ${benchmark.label}.`
  }

  let expenseText = ''
  if (expenseStatus === 'critical') {
    expenseText = `Expense ratio at ${ratio}% is critically above the ${benchmark.expenseRatioWarning}% reference threshold.`
  } else if (expenseStatus === 'warning') {
    expenseText = `Expense ratio at ${ratio}% is approaching the ${benchmark.expenseRatioWarning}% reference threshold.`
  } else {
    expenseText = `Expense ratio at ${ratio}% is within acceptable limits (reference threshold: ${benchmark.expenseRatioWarning}%).`
  }

  return { marginText, expenseText, marginStatus, expenseStatus, benchmark }
}

/**
 * Generate a benchmark-aware recommendation snippet for AI context enrichment.
 */
export function getBenchmarkRecommendation(profitMargin, expenseRatio, category) {
  const benchmark = getBenchmark(category)
  const marginStatus = compareMargin(profitMargin, benchmark)
  const expenseStatus = compareExpenseRatio(expenseRatio, benchmark)
  const [min] = benchmark.profitMarginRange

  const recommendations = []

  if (marginStatus === 'below') {
    recommendations.push(
      `Your profit margin is below the illustrative ${benchmark.label} reference range (${min}%+). Consider reducing operating expenses or improving pricing strategy.`
    )
  }

  if (expenseStatus === 'warning' || expenseStatus === 'critical') {
    recommendations.push(
      `Your expense ratio is at or above the ${benchmark.label} reference threshold (${benchmark.expenseRatioWarning}%). Review cost structure for optimization opportunities.`
    )
  }

  return recommendations
}

export { INDUSTRY_BENCHMARKS, DEFAULT_BENCHMARK }
export default INDUSTRY_BENCHMARKS
