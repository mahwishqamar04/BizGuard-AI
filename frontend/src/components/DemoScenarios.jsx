import { useState } from 'react'

/**
 * DemoScenarios — One-click business demo scenarios for presentations.
 *
 * Each scenario loads realistic preset business data through the EXISTING
 * application pipeline (save → calculate metrics → analyze → dashboard).
 * No health scores are hardcoded; all calculations use the normal flow.
 *
 * Props:
 *   onLoadDemo : (scenarioData) => void  — called when a scenario is clicked
 *   loading    : boolean                  — disables buttons while data loads
 */

const SCENARIOS = [
  {
    id: 'healthy',
    icon: '🟢',
    label: 'Healthy Business',
    description: 'Strong profitability and controlled expenses',
    color: '#48bb78',
    bg: '#f0fff4',
    border: '#c6f6d5',
    hoverBorder: '#48bb78',
    data: {
      name: 'TechFlow Solutions',
      category: 'Technology',
      sales: 120000,
      expenses: 72000,
      profit: 48000,
      employees: 25,
    },
  },
  {
    id: 'at-risk',
    icon: '🟠',
    label: 'At-Risk Business',
    description: 'Profit pressure and rising expenses',
    color: '#ed8936',
    bg: '#fffaf0',
    border: '#feebc8',
    hoverBorder: '#ed8936',
    data: {
      name: 'Corner Market Store',
      category: 'Retail',
      sales: 65000,
      expenses: 52000,
      profit: 13000,
      employees: 12,
    },
  },
  {
    id: 'critical',
    icon: '🔴',
    label: 'Critical Business',
    description: 'Severe financial pressure requiring immediate action',
    color: '#e53e3e',
    bg: '#fff5f5',
    border: '#fed7d7',
    hoverBorder: '#e53e3e',
    data: {
      name: 'Quick Fix Repairs',
      category: 'Services',
      sales: 28000,
      expenses: 35000,
      profit: -7000,
      employees: 8,
    },
  },
]

function DemoScenarios({ onLoadDemo, loading }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div className="demo-scenarios-section">
      <div className="demo-scenarios-header">
        <h3>🎯 Demo Scenarios</h3>
        <p>Click a scenario to instantly load realistic business data for demonstration.</p>
      </div>

      <div className="demo-scenarios-grid">
        {SCENARIOS.map((scenario) => {
          const isHovered = hoveredId === scenario.id
          return (
            <button
              key={scenario.id}
              className={`demo-scenario-card ${isHovered ? 'hovered' : ''}`}
              style={{
                '--scenario-color': scenario.color,
                '--scenario-bg': scenario.bg,
                '--scenario-border': scenario.border,
                '--scenario-hover-border': scenario.hoverBorder,
              }}
              onClick={() => onLoadDemo(scenario.data)}
              disabled={loading}
              onMouseEnter={() => setHoveredId(scenario.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={`Load ${scenario.label} demo scenario: ${scenario.description}`}
            >
              <div className="demo-scenario-icon" aria-hidden="true">
                {scenario.icon}
              </div>
              <div className="demo-scenario-content">
                <strong className="demo-scenario-label">{scenario.label}</strong>
                <span className="demo-scenario-desc">{scenario.description}</span>
              </div>
              {loading && (
                <span className="loading-spinner-sm" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DemoScenarios
