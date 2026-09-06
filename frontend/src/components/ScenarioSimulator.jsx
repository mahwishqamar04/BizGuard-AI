import { useState, useMemo, useCallback, useEffect } from 'react'

/**
 * ScenarioSimulator — What-If Scenario Simulator
 *
 * Allows users to experiment with projected changes to sales and expenses
 * using percentage sliders. Calculates and displays a BEFORE vs PROJECTED
 * comparison without modifying the real business data.
 *
 * Props:
 *   sales       : number — current monthly sales
 *   expenses    : number — current monthly expenses
 *   profit      : number — current profit (sales - expenses)
 *   profitMargin: number — current profit margin (%)
 *   healthScore : number — current health score (0-100)
 *
 * This component is completely read-only — it never triggers API writes
 * or modifies the parent's business data.
 */

// Mirror the existing health-score fallback logic from DashboardScreen
function calcProjectedHealth(projectedProfit, projectedSales) {
  if (projectedProfit > 0 && projectedSales > 0) {
    return Math.min(100, Math.round((projectedProfit / projectedSales) * 200))
  }
  return 0
}

function getHealthStatus(score) {
  if (score >= 70) return 'Excellent'
  if (score >= 50) return 'Good'
  if (score >= 30) return 'Fair'
  return 'At Risk'
}

function getHealthColor(score) {
  if (score >= 70) return '#48bb78'
  if (score >= 50) return '#4299e1'
  if (score >= 30) return '#ed8936'
  return '#e53e3e'
}

function formatCurrency(v) {
  const abs = Math.abs(Math.round(v))
  if (v < 0) return '-$' + abs.toLocaleString()
  return '$' + abs.toLocaleString()
}

function formatChange(v) {
  const abs = Math.abs(Math.round(v))
  if (v > 0) return '+$' + abs.toLocaleString()
  if (v < 0) return '-$' + abs.toLocaleString()
  return '$0'
}

function formatPctChange(v) {
  if (v > 0) return '+' + v.toFixed(1) + '%'
  if (v < 0) return v.toFixed(1) + '%'
  return '0%'
}

function ScenarioSimulator({ sales, expenses, profit, profitMargin, healthScore }) {
  const [expenseChange, setExpenseChange] = useState(-10)
  const [salesChange, setSalesChange] = useState(0)

  // Reset sliders when baseline business data changes (e.g., demo scenario switch)
  useEffect(() => {
    setExpenseChange(-10)
    setSalesChange(0)
  }, [sales, expenses])

  // All projected values are computed — never stored in parent state
  const projected = useMemo(() => {
    const projSales = sales * (1 + salesChange / 100)
    const projExpenses = expenses * (1 + expenseChange / 100)
    const projProfit = projSales - projExpenses
    const projMargin = projSales > 0 ? (projProfit / projSales) * 100 : 0
    const projHealth = calcProjectedHealth(projProfit, projSales)

    return {
      sales: projSales,
      expenses: projExpenses,
      profit: projProfit,
      margin: projMargin,
      health: projHealth,
      healthStatus: getHealthStatus(projHealth),
      healthColor: getHealthColor(projHealth),
    }
  }, [sales, expenses, salesChange, expenseChange])

  // Deltas
  const deltas = useMemo(() => ({
    profit: projected.profit - profit,
    margin: projected.margin - profitMargin,
    health: projected.health - healthScore,
  }), [projected, profit, profitMargin, healthScore])

  // Dynamic recommendation based on simulation results
  const recommendation = useMemo(() => {
    const parts = []

    if (projected.profit < 0) {
      parts.push('This change alone may not be enough to return the business to profitability.')
    } else if (deltas.profit > 0 && projected.profit > profit) {
      if (expenseChange < 0 && salesChange === 0) {
        parts.push('Reducing expenses could materially improve profitability.')
      } else if (salesChange > 0 && expenseChange === 0) {
        parts.push('Increasing sales has a significant positive effect on projected profit.')
      } else if (salesChange > 0 && expenseChange < 0) {
        parts.push('Combining sales growth with expense reduction creates a strong positive impact.')
      } else {
        parts.push('The projected changes improve profitability.')
      }
    } else if (deltas.profit < 0) {
      parts.push('The simulated changes would reduce profitability. Consider adjusting the parameters.')
    } else {
      parts.push('The projected scenario maintains current performance levels.')
    }

    if (projected.health > healthScore + 15) {
      parts.push('Projected health score shows significant improvement.')
    } else if (projected.health < healthScore - 10) {
      parts.push('Warning: projected health score declines under this scenario.')
    }

    return parts.join(' ')
  }, [projected, deltas, profit, healthScore, expenseChange, salesChange])

  const handleReset = useCallback(() => {
    setSalesChange(0)
    setExpenseChange(-10)
  }, [])

  const profitImprovement = deltas.profit

  return (
    <div className="simulator-section">
      <div className="simulator-header">
        <div>
          <h2>🔬 What-If Scenario Simulator</h2>
          <p className="simulator-subtitle">
            Experiment with changes to see projected impact — your real data is never modified.
          </p>
        </div>
        <button className="simulator-reset-btn" onClick={handleReset} type="button">
          ↺ Reset Simulation
        </button>
      </div>

      {/* Slider Controls */}
      <div className="simulator-controls">
        <div className="simulator-slider-group">
          <label htmlFor="sim-expense" className="simulator-slider-label">
            <span className="slider-label-icon">💸</span>
            <span>Expense Change</span>
            <span className="slider-value" style={{ color: expenseChange < 0 ? '#48bb78' : expenseChange > 0 ? '#e53e3e' : '#718096' }}>
              {expenseChange > 0 ? '+' : ''}{expenseChange}%
            </span>
          </label>
          <input
            id="sim-expense"
            type="range"
            min={-30}
            max={30}
            step={1}
            value={expenseChange}
            onChange={(e) => setExpenseChange(Number(e.target.value))}
            className="simulator-range-input"
            aria-valuenow={expenseChange}
            aria-valuemin={-30}
            aria-valuemax={30}
            aria-label={`Expense change: ${expenseChange} percent`}
          />
          <div className="slider-range-labels">
            <span>-30%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
        </div>

        <div className="simulator-slider-group">
          <label htmlFor="sim-sales" className="simulator-slider-label">
            <span className="slider-label-icon">💰</span>
            <span>Sales Change</span>
            <span className="slider-value" style={{ color: salesChange > 0 ? '#48bb78' : salesChange < 0 ? '#e53e3e' : '#718096' }}>
              {salesChange > 0 ? '+' : ''}{salesChange}%
            </span>
          </label>
          <input
            id="sim-sales"
            type="range"
            min={-20}
            max={20}
            step={1}
            value={salesChange}
            onChange={(e) => setSalesChange(Number(e.target.value))}
            className="simulator-range-input"
            aria-valuenow={salesChange}
            aria-valuemin={-20}
            aria-valuemax={20}
            aria-label={`Sales change: ${salesChange} percent`}
          />
          <div className="slider-range-labels">
            <span>-20%</span>
            <span>0%</span>
            <span>+20%</span>
          </div>
        </div>
      </div>

      {/* Profit Improvement Banner */}
      <div className={`simulator-improvement-banner ${profitImprovement > 0 ? 'positive' : profitImprovement < 0 ? 'negative' : 'neutral'}`}>
        <span className="improvement-label">
          {profitImprovement > 0 ? '📈 Potential Profit Improvement' : profitImprovement < 0 ? '📉 Projected Profit Decline' : '➡ No Change in Profit'}
        </span>
        <span className="improvement-value">
          {formatChange(profitImprovement)}
        </span>
      </div>

      {/* Before vs Projected Comparison */}
      <div className="simulator-comparison">
        <div className="simulator-col current-col">
          <div className="col-header current-header">
            <span className="col-badge current-badge">CURRENT</span>
            <h3>Your Business Today</h3>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Sales</span>
            <span className="comp-value">{formatCurrency(sales)}</span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Expenses</span>
            <span className="comp-value">{formatCurrency(expenses)}</span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Profit</span>
            <span className="comp-value">{formatCurrency(profit)}</span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Profit Margin</span>
            <span className="comp-value">{profitMargin.toFixed(2)}%</span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Health Score</span>
            <span className="comp-value" style={{ color: getHealthColor(healthScore) }}>
              {healthScore}/100
            </span>
          </div>
        </div>

        <div className="simulator-arrow-col">
          <div className="sim-arrow">→</div>
        </div>

        <div className="simulator-col projected-col">
          <div className="col-header projected-header">
            <span className="col-badge projected-badge">PROJECTED</span>
            <h3>After Simulated Changes</h3>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Sales</span>
            <span className="comp-value">{formatCurrency(projected.sales)}</span>
            <span className={`comp-delta ${projected.sales - sales >= 0 ? 'positive' : 'negative'}`}>
              {formatChange(projected.sales - sales)}
            </span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Expenses</span>
            <span className="comp-value">{formatCurrency(projected.expenses)}</span>
            <span className={`comp-delta ${projected.expenses - expenses <= 0 ? 'positive' : 'negative'}`}>
              {formatChange(projected.expenses - expenses)}
            </span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Profit</span>
            <span className="comp-value">{formatCurrency(projected.profit)}</span>
            <span className={`comp-delta ${deltas.profit >= 0 ? 'positive' : 'negative'}`}>
              {formatChange(deltas.profit)}
            </span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Profit Margin</span>
            <span className="comp-value">{projected.margin.toFixed(2)}%</span>
            <span className={`comp-delta ${deltas.margin >= 0 ? 'positive' : 'negative'}`}>
              {formatPctChange(deltas.margin)}
            </span>
          </div>
          <div className="comparison-row">
            <span className="comp-label">Projected Health</span>
            <span className="comp-value" style={{ color: projected.healthColor }}>
              {projected.health}/100
            </span>
            <span className={`comp-delta ${deltas.health >= 0 ? 'positive' : 'negative'}`}>
              {deltas.health >= 0 ? '+' : ''}{deltas.health}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="simulator-recommendation">
        <div className="rec-icon">💡</div>
        <p>{recommendation}</p>
      </div>

      <p className="simulator-disclaimer">
        ⓘ This is an illustrative projection only. Actual results may vary. Your real business data is never changed.
      </p>
    </div>
  )
}

export default ScenarioSimulator
