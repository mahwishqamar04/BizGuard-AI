import { useState, useEffect } from 'react'
import './App.css'
import HealthGauge from './components/HealthGauge'
import { SalesExpensesChart, ProfitMarginGauge, ExpenseRatioGauge } from './components/DashboardCharts'
import DemoScenarios from './components/DemoScenarios'
import AnimatedNumber from './components/AnimatedNumber'
import IndustryBenchmark from './components/IndustryBenchmark'
import ScenarioSimulator from './components/ScenarioSimulator'
import { getBenchmarkRecommendation } from './config/industryBenchmarks'

// Stable formatter functions for AnimatedNumber (module-level to avoid re-renders)
const fmtCurrency = (v) => '$' + Math.round(v).toLocaleString()
const fmtPercent2 = (v) => parseFloat(v).toFixed(2) + '%'
const fmtPercent0 = (v) => Math.round(v) + '%'

function App() {
  // Screens: welcome, setup, dashboard, assistant
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [businessData, setBusinessData] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // AI Assistant state
  const [assistantMessages, setAssistantMessages] = useState([])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)

  // CSV Upload state
  const [uploadStatus, setUploadStatus] = useState(null)

  // Inventory Management state
  const [inventoryItems, setInventoryItems] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState('')
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [inventoryForm, setInventoryForm] = useState({ name: '', quantity: '', minStock: '', price: '', category: '' })

  // Configurable API base URL — set VITE_API_URL env var for production deployments.
  // In development, leave unset and the Vite proxy handles /api forwarding.
  const API_URL = import.meta.env.VITE_API_URL || '/api/ai'

  // Helper function to calculate metrics from business data
  const calculateMetrics = (business) => {
    if (!business) return null
    
    const sales = business.sales || 0
    const expenses = business.expenses || 0
    const profit = business.profit !== undefined ? business.profit : (sales - expenses)
    
    return {
      ...business,
      profit,
      profitMargin: sales > 0 ? parseFloat(((profit / sales) * 100).toFixed(2)) : 0,
      expenseRatio: sales > 0 ? Math.round((expenses / sales) * 100) : 0,
    }
  }

  // NOTE: Business data is NOT auto-loaded on mount.
  // The frontend starts in a clean/empty state each session.
  // Data is loaded when the user saves the Business Setup form or uploads a CSV.

  const loadBusinessData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${API_URL}/business`)
      const data = await response.json()
      if (response.ok && data.success) {
        const calculatedMetrics = calculateMetrics(data.data)
        setBusinessData(data.data)
        setMetrics(calculatedMetrics)
        // Auto-trigger analysis on initial load
        const businessContext = {
          ...data.data,
          profit: data.data.profit !== undefined ? data.data.profit : ((data.data.sales || 0) - (data.data.expenses || 0)),
        }
        try {
          const analysisRes = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessContext }),
          })
          const analysisData = await analysisRes.json()
          if (analysisRes.ok && analysisData.success) {
            setAnalysis(analysisData.data)
          }
        } catch (e) {
          console.warn('Auto-analysis failed:', e)
        }
      } else {
        console.warn('Could not load business data:', data.error)
      }
    } catch (err) {
      console.warn('Error loading business data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load a demo scenario through the existing business data pipeline.
  // This reuses handleSaveBusiness so all calculations, analysis, and
  // navigation happen through the normal application flow.
  const handleLoadDemo = (scenarioData) => {
    handleSaveBusiness(scenarioData)
  }

  const handleSaveBusiness = async (formData) => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${API_URL}/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        // Update business data and calculate metrics from the latest data
        const savedData = data.data
        setBusinessData(savedData)
        
        // Calculate and set metrics with current business data
        const calculatedMetrics = calculateMetrics(savedData)
        setMetrics(calculatedMetrics)
        
        // Re-analyze business with new data and wait for completion
        await getAnalysis(savedData)
        
        // Navigate to dashboard to show updated analysis
        setCurrentScreen('dashboard')
      } else {
        setError(data.message || 'Failed to save business data. Please try again.')
      }
    } catch (err) {
      console.error('Error saving business:', err)
      setError('Failed to connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const getAnalysis = async (business) => {
    // Validate business data exists and has required fields
    if (!business || typeof business !== 'object') {
      setError('Invalid business data. Please check your business information.')
      return
    }

    // Ensure profit is calculated
    const businessContext = {
      ...business,
      profit: business.profit !== undefined ? business.profit : ((business.sales || 0) - (business.expenses || 0)),
    }

    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessContext }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        // Update analysis with fresh data based on current business metrics
        setAnalysis(data.data)
      } else {
        console.error('Analysis error:', data.error || 'Unknown error')
        setError('Could not retrieve business analysis. Please try again.')
      }
    } catch (err) {
      console.error('Error getting analysis:', err)
      setError('Failed to connect to analysis service. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const MAX_MESSAGE_LENGTH = 5000

  const askAssistant = async () => {
    // Prevent duplicate requests while one is in progress
    if (assistantLoading) return

    // Validate empty/whitespace-only message with visible feedback
    if (!assistantInput.trim()) {
      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Please enter a message before sending.',
      }])
      return
    }

    // Validate message length
    if (assistantInput.length > MAX_MESSAGE_LENGTH) {
      setAssistantMessages(prev => [...prev, {
        role: 'assistant',
        text: `⚠️ Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      }])
      return
    }

    // If business context is missing, still allow the question but note the limitation
    const contextToSend = businessData || {}
    const hasContext = !!businessData

    const userMessage = assistantInput
    setAssistantInput('')
    setAssistantMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setAssistantLoading(true)

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          businessContext: contextToSend,
        }),
      })

      const data = await response.json()

      // Check if response was successful
      if (response.ok && data.success) {
        // If no business context, prepend a note to the AI response
        const prefix = !hasContext ? '⚠️ Note: No business data is set up, so this answer is based on general guidance. Click "Business" to add your data for personalized insights.\n\n' : ''
        setAssistantMessages(prev => [...prev, { role: 'assistant', text: prefix + data.answer }])
      } else {
        // Handle specific error codes from backend
        let errorMessage = 'Sorry, I could not answer your question right now.'
        
        if (data.error) {
          switch (data.error) {
            case 'MISSING_MESSAGE':
              errorMessage = '⚠️ Message cannot be empty.'
              break
            case 'INVALID_MESSAGE_TYPE':
              errorMessage = '⚠️ Invalid message format.'
              break
            case 'EMPTY_MESSAGE':
              errorMessage = '⚠️ Please enter a message.'
              break
            case 'MESSAGE_TOO_LONG':
              errorMessage = `⚠️ ${data.message || 'Message is too long.'}`
              break
            case 'INVALID_BUSINESS_CONTEXT':
              errorMessage = '⚠️ Invalid business data. Please update your business information.'
              break
            case 'AI_SERVICE_UNAVAILABLE':
              errorMessage = '🔧 AI service is temporarily unavailable. Please try again in a moment.'
              break
            case 'AI_PROCESSING_ERROR':
              errorMessage = '❌ Error processing your request. Please try again.'
              break
            default:
              errorMessage = 'Sorry, I could not answer your question right now.'
          }
        }
        
        setAssistantMessages(prev => [...prev, { role: 'assistant', text: errorMessage }])
      }
    } catch (err) {
      // Network or parsing error — never expose internals
      console.error('Error asking assistant:', err)
      const errorMessage = err.message && (err.message.includes('fetch') || err.message.includes('network'))
        ? '🌐 Cannot connect to the AI service. Make sure the backend server is running.'
        : '❌ An unexpected error occurred. Please try again.'
      setAssistantMessages(prev => [...prev, { role: 'assistant', text: errorMessage }])
    } finally {
      setAssistantLoading(false)
    }
  }

  const handleCSVUpload = async (csvText) => {
    try {
      setLoading(true)
      setError('')
      setUploadStatus(null)

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setUploadStatus({
          success: true,
          type: data.type,
          rowCount: data.rowCount,
          validation: data.validation,
        })

        if (data.type === 'financial' && data.data) {
          const calculatedMetrics = calculateMetrics(data.data)
          setBusinessData(data.data)
          setMetrics(calculatedMetrics)
          // Re-analyze after financial upload
          await getAnalysis(data.data)
        }

        if (data.type === 'inventory' && data.data) {
          // Reload business data to get updated inventory
          await loadBusinessData()
        }

        // Auto-redirect to Dashboard after a brief delay so the user
        // can see the success notification before the screen changes.
        setTimeout(() => {
          setCurrentScreen('dashboard')
        }, 1200)
      } else {
        const rawError = data.validation?.errors?.join('; ') || data.message || 'CSV upload failed'
        // Make error messages more user-friendly
        const errorMsg = rawError
          .replace(/Missing required columns?/gi, 'Missing columns')
          .replace(/unknown columns?/gi, 'Unrecognized columns')
        setError('⚠️ ' + errorMsg)
        setUploadStatus({ success: false, validation: data.validation })
      }
    } catch (err) {
      console.error('CSV upload error:', err)
      setError('Failed to connect to server for CSV upload.')
    } finally {
      setLoading(false)
    }
  }

  // --- Inventory Management Functions ---
  const loadInventory = async () => {
    try {
      setInventoryLoading(true)
      setInventoryError('')
      const response = await fetch(`${API_URL}/inventory`)
      const data = await response.json()
      if (response.ok && data.success) {
        setInventoryItems(data.data.inventory || [])
      } else {
        setInventoryError(data.message || 'Failed to load inventory')
      }
    } catch (err) {
      console.error('Error loading inventory:', err)
      setInventoryError('Failed to connect to server. Make sure the backend is running.')
    } finally {
      setInventoryLoading(false)
    }
  }

  const saveInventory = async (items) => {
    try {
      setInventoryLoading(true)
      setInventoryError('')
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: items }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setInventoryItems(data.data || items)
        return true
      } else {
        setInventoryError(data.message || 'Failed to save inventory')
        return false
      }
    } catch (err) {
      console.error('Error saving inventory:', err)
      setInventoryError('Failed to connect to server.')
      return false
    } finally {
      setInventoryLoading(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!inventoryForm.name.trim()) {
      setInventoryError('Item name is required')
      return
    }
    const maxId = inventoryItems.reduce((max, item) => Math.max(max, item.id || 0), 0)
    const newItem = {
      id: maxId + 1,
      name: inventoryForm.name.trim(),
      quantity: parseInt(inventoryForm.quantity) || 0,
      minStock: parseInt(inventoryForm.minStock) || 0,
      price: parseFloat(inventoryForm.price) || 0,
      category: inventoryForm.category.trim() || 'General',
    }
    const success = await saveInventory([...inventoryItems, newItem])
    if (success) {
      setShowInventoryForm(false)
      setInventoryForm({ name: '', quantity: '', minStock: '', price: '', category: '' })
    }
  }

  const handleEditItem = async (e) => {
    e.preventDefault()
    if (!inventoryForm.name.trim()) {
      setInventoryError('Item name is required')
      return
    }
    const updated = inventoryItems.map(item =>
      item.id === editingItem.id ? {
        ...item,
        name: inventoryForm.name.trim(),
        quantity: parseInt(inventoryForm.quantity) || 0,
        minStock: parseInt(inventoryForm.minStock) || 0,
        price: parseFloat(inventoryForm.price) || 0,
        category: inventoryForm.category.trim() || 'General',
      } : item
    )
    const success = await saveInventory(updated)
    if (success) {
      setEditingItem(null)
      setShowInventoryForm(false)
      setInventoryForm({ name: '', quantity: '', minStock: '', price: '', category: '' })
    }
  }

  const handleDeleteItem = async (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId)
    if (!window.confirm(`Delete "${item?.name}"? This cannot be undone.`)) return
    const updated = inventoryItems.filter(i => i.id !== itemId)
    await saveInventory(updated)
  }

  const handleEditClick = (item) => {
    setEditingItem(item)
    setInventoryForm({
      name: item.name,
      quantity: item.quantity,
      minStock: item.minStock,
      price: item.price,
      category: item.category || '',
    })
    setShowInventoryForm(true)
  }

  const handleCancelForm = () => {
    setShowInventoryForm(false)
    setEditingItem(null)
    setInventoryForm({ name: '', quantity: '', minStock: '', price: '', category: '' })
    setInventoryError('')
  }

  return (
    <div className="app">
      {/* Header Navigation */}
      <header className="app-header">
        <div className="header-content">
          <h1>🛡️ BizGuard AI</h1>
          <p>Your AI Business Guardian</p>
        </div>
        <nav className="nav-buttons">
          <button
            className={`nav-btn ${currentScreen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${currentScreen === 'assistant' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('assistant')}
          >
            Ask AI
          </button>
          <button
            className={`nav-btn ${currentScreen === 'upload' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('upload')}
          >
            Upload CSV
          </button>
          <button
            className={`nav-btn ${currentScreen === 'inventory' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('inventory')}
          >
            Inventory
          </button>
          <button
            className={`nav-btn ${currentScreen === 'setup' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('setup')}
          >
            Business
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
            <button
              className="error-dismiss"
              onClick={() => setError('')}
              aria-label="Dismiss error message"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* Welcome Screen */}
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            onGetStarted={() => setCurrentScreen('dashboard')}
          />
        )}

        {/* Business Setup Screen */}
        {currentScreen === 'setup' && (
          <BusinessSetupScreen
            initialData={businessData}
            onSave={handleSaveBusiness}
            loading={loading}
          />
        )}

        {/* Dashboard Screen */}
        {currentScreen === 'dashboard' && (
          businessData ? (
            <DashboardScreen
              business={businessData}
              metrics={metrics}
              analysis={analysis}
              loading={loading}
              onAnalyze={() => getAnalysis(businessData)}
              onManageInventory={() => setCurrentScreen('inventory')}
              onLoadDemo={handleLoadDemo}
            />
          ) : (
            <div className="screen welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">📊</div>
                <h2>Dashboard</h2>
                <p>No business data yet. Use the <strong>Business</strong> tab to enter your information or <strong>Upload CSV</strong> to import data.</p>
                <button className="btn-primary" onClick={() => setCurrentScreen('setup')} style={{ marginTop: '16px' }}>
                  Set Up Your Business
                </button>
              </div>
              <DemoScenarios onLoadDemo={handleLoadDemo} loading={loading} />
            </div>
          )
        )}

        {/* CSV Upload Screen */}
        {currentScreen === 'upload' && (
          <CSVUploadScreen
            onUpload={handleCSVUpload}
            loading={loading}
            uploadStatus={uploadStatus}
          />
        )}

        {/* Inventory Management Screen */}
        {currentScreen === 'inventory' && (
          <InventoryManagementScreen
            apiUrl={API_URL}
            onBack={() => setCurrentScreen('dashboard')}
          />
        )}

        {/* AI Assistant Screen */}
        {currentScreen === 'assistant' && (
          <AssistantScreen
            messages={assistantMessages}
            input={assistantInput}
            onInputChange={setAssistantInput}
            onSend={askAssistant}
            loading={assistantLoading}
          />
        )}
      </main>
    </div>
  )
}

// Welcome Screen Component
function WelcomeScreen({ onGetStarted }) {
  return (
    <div className="screen welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">🛡️</div>
        <h2>Welcome to BizGuard AI</h2>
        <p>Your AI-powered business assistant and guardian for small businesses</p>
        
        <div className="features">
          <div className="feature">
            <span className="feature-icon">📊</span>
            <h3>Smart Analytics</h3>
            <p>Understand your business data at a glance</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🔍</span>
            <h3>Risk Detection</h3>
            <p>Identify problems before they become serious</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📦</span>
            <h3>Inventory Alerts</h3>
            <p>Monitor stock levels and get low-stock warnings</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📁</span>
            <h3>CSV Data Import</h3>
            <p>Upload your business data in one click</p>
          </div>
        </div>

        <button className="btn-primary" onClick={onGetStarted}>
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

// Business Setup Screen Component
function BusinessSetupScreen({ initialData, onSave, loading }) {
  const [formData, setFormData] = useState(
    initialData || {
      name: '',
      category: 'Retail',
      sales: '',
      expenses: '',
      profit: '',
      employees: '',
    }
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    const newData = {
      ...formData,
      [name]: name === 'name' || name === 'category' ? value : parseFloat(value),
    }
    
    // Auto-calculate profit if sales and expenses change
    if (name === 'sales' || name === 'expenses') {
      newData.profit = (newData.sales || 0) - (newData.expenses || 0);
    }
    
    setFormData(newData)
  }

  return (
    <div className="screen setup-screen">
      <div className="setup-container">
        <h2>Business Information</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData) }}>
          <div className="form-group">
            <label>Business Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Business Category</label>
            <select name="category" value={formData.category} onChange={handleChange} disabled={loading}>
              <option>Retail</option>
              <option>Restaurant / Food</option>
              <option>Services</option>
              <option>Manufacturing</option>
              <option>Technology</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Monthly Sales</label>
              <input
                type="number"
                name="sales"
                value={formData.sales}
                onChange={handleChange}
                disabled={loading}
                min="0"
                required
                aria-label="Monthly sales amount"
              />
            </div>

            <div className="form-group">
              <label>Monthly Expenses</label>
              <input
                type="number"
                name="expenses"
                value={formData.expenses}
                onChange={handleChange}
                disabled={loading}
                min="0"
                required
                aria-label="Monthly expenses amount"
              />
            </div>

            <div className="form-group">
              <label>Monthly Profit <span className="field-hint">(auto-calculated)</span></label>
              <input
                type="number"
                name="profit"
                value={formData.profit}
                onChange={handleChange}
                disabled={loading}
                title="Auto-calculated from Sales - Expenses"
                aria-label="Monthly profit, auto-calculated from sales minus expenses"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Employees</label>
            <input
              type="number"
              name="employees"
              value={formData.employees}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading"><span className="loading-spinner-sm"></span> Saving...</span>
            ) : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Dashboard Screen Component
function DashboardScreen({ business, metrics, analysis, loading, onAnalyze, onManageInventory, onLoadDemo }) {
  // Use health score from analysis if available, otherwise calculate
  const healthScore = analysis?.healthScore ?? (
    business.profit > 0 
      ? Math.min(100, Math.round((business.profit / business.sales) * 200))
      : 0
  );
  
  const healthStatus = analysis?.healthStatus ?? (
    healthScore >= 70 ? 'Excellent' :
    healthScore >= 50 ? 'Good' :
    healthScore >= 30 ? 'Fair' : 'At Risk'
  );
  
  const healthStatusColor = analysis?.healthStatusColor ?? (
    healthScore >= 70 ? 'success' :
    healthScore >= 50 ? 'info' :
    healthScore >= 30 ? 'warning' : 'danger'
  );

  const profitMargin = metrics?.profitMargin ?? 
    (business.sales > 0 ? ((business.profit / business.sales) * 100).toFixed(2) : 0);
  
  const expenseRatio = metrics?.expenseRatio ??
    (business.sales > 0 ? Math.round((business.expenses / business.sales) * 100) : 0);

  // Get risks and recommendations from analysis
  const risks = analysis?.risks ?? [];
  const recommendations = analysis?.recommendations ?? [];

  // Get inventory data from analysis
  const inventory = analysis?.inventory ?? null;
  const inventoryItems = business.inventory ?? [];
  const lowStockItems = inventory?.lowStockItems ?? inventoryItems.filter(i => i.quantity <= i.minStock);

  return (
    <div className="screen dashboard-screen">
      {/* Business Header */}
      <div className="business-header">
        <div>
          <h2>{business.name}</h2>
          <p>{business.category} • {business.employees} employees</p>
        </div>
        <div className="health-gauge-container">
          <HealthGauge score={healthScore} status={healthStatus} />
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-label">💰 Monthly Sales</div>
          <div className="metric-value">
            <AnimatedNumber value={business.sales} formatter={fmtCurrency} />
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-label">💸 Monthly Expenses</div>
          <div className="metric-value">
            <AnimatedNumber value={business.expenses} formatter={fmtCurrency} />
          </div>
          <div className="metric-subtext">
            <AnimatedNumber value={expenseRatio} formatter={fmtPercent0} /> of revenue
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-label">📈 Monthly Profit</div>
          <div className="metric-value">
            <AnimatedNumber value={business.profit} formatter={fmtCurrency} />
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-label">📊 Profit Margin</div>
          <div className="metric-value">
            <AnimatedNumber value={profitMargin} formatter={fmtPercent2} />
          </div>
          <div className="metric-subtext">of sales revenue</div>
        </div>
      </div>

      {/* Data Visualizations */}
      <div className="charts-section">
        {/* Sales vs Expenses */}
        <SalesExpensesChart sales={business.sales} expenses={business.expenses} />

        {/* Profit Margin + Expense Ratio side by side */}
        <div className="charts-row">
          <ProfitMarginGauge profitMargin={profitMargin} />
          <ExpenseRatioGauge expenseRatio={expenseRatio} />
        </div>
      </div>

      {/* Industry Benchmark Section */}
      <IndustryBenchmark
        profitMargin={profitMargin}
        expenseRatio={expenseRatio}
        category={business.category}
      />

      {/* What-If Scenario Simulator */}
      <ScenarioSimulator
        sales={business.sales}
        expenses={business.expenses}
        profit={business.profit}
        profitMargin={profitMargin}
        healthScore={healthScore}
      />

      {/* AI Analysis Workflow Section */}
      <div className="analysis-section">
        <div className="section-header">
          <h2>🤖 AI Business Analysis</h2>
          <button className="btn-secondary" onClick={onAnalyze} disabled={loading}>
            {loading ? (
              <span className="btn-loading"><span className="loading-spinner-sm"></span> Analyzing...</span>
            ) : (analysis ? 'Re-Analyze' : 'Analyze Business')}
          </button>
        </div>
      
        {loading && !analysis && (
          <div className="analysis-loading" role="status" aria-live="polite">
            <div className="loading-spinner-sm"></div>
            <p>Analyzing your business data...</p>
          </div>
        )}
      
        {!loading && !analysis ? (
          <div className="no-analysis">
            <p>Click "Analyze Business" to get AI insights about your financial health.</p>
          </div>
        ) : analysis ? (
          <>
            {/* Workflow Visualization */}
            <div className="workflow-container">
              <div className="workflow-step">
                <div className="workflow-icon">📊</div>
                <div className="workflow-title">ANALYZE</div>
                <div className="workflow-content">
                  <p>Sales: ${business.sales?.toLocaleString()}</p>
                  <p>Expenses: ${business.expenses?.toLocaleString()}</p>
                  <p>Profit: ${business.profit?.toLocaleString()}</p>
                  <p>Margin: {profitMargin}%</p>
                </div>
              </div>

              <div className="workflow-arrow">→</div>

              <div className="workflow-step">
                <div className="workflow-icon">🔍</div>
                <div className="workflow-title">DETECT</div>
                <div className="workflow-content">
                  {risks.length > 0 ? (
                    <>
                      {risks.slice(0, 2).map((risk, i) => (
                        <div key={i} className={`issue-badge severity-${risk.severity}`}>
                          {risk.title}
                        </div>
                      ))}
                      {risks.length > 2 && (
                        <div className="more-risks">+{risks.length - 2} more</div>
                      )}
                    </>
                  ) : (
                    <p className="no-issues">✓ No major issues detected</p>
                  )}
                </div>
              </div>

              <div className="workflow-arrow">→</div>

              <div className="workflow-step">
                <div className="workflow-icon">💡</div>
                <div className="workflow-title">EXPLAIN &<br/>RECOMMEND</div>
                <div className="workflow-content">
                  {recommendations.length > 0 && (
                    <p>{recommendations[0].title}</p>
                  )}
                  {recommendations.length > 1 && (
                    <p className="more-items">+{recommendations.length - 1} more</p>
                  )}
                </div>
              </div>
            </div>

            {/* Risks/Alerts Section */}
            {risks.length > 0 && (
              <div className="analysis-box alerts-box">
                <div className="box-header">
                  <h3>⚠️ Detected Risks</h3>
                  <span className="issue-count">{risks.length}</span>
                </div>
                <div className="alerts-list">
                  {risks.map((risk, i) => (
                    <div key={i} className={`alert-item severity-${risk.severity}`}>
                      <div className="alert-icon">
                        {risk.severity === 'critical' ? '🔴' : 
                         risk.severity === 'high' ? '🔴' : '🟡'}
                      </div>
                      <div className="alert-content">
                        <strong>{risk.title}</strong>
                        <p>{risk.description}</p>
                        <div className="recommendation-action">{risk.recommendation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
              <div className="analysis-box recommendations-box">
                <div className="box-header">
                  <h3>💡 Recommendations</h3>
                  <span className="rec-count">{recommendations.length}</span>
                </div>
                <div className="recommendations-list">
                  {recommendations.map((rec, i) => (
                    <div key={i} className={`recommendation-item priority-${rec.priority}`}>
                      <div className="rec-header">
                        <strong>{rec.title}</strong>
                        <span className={`priority-badge priority-${rec.priority}`}>
                          {rec.priority === 'high' ? '🔥' : '💪'}
                        </span>
                      </div>
                      <p>{rec.description}</p>
                      {rec.actions && rec.actions.length > 0 && (
                        <ul className="actions-list">
                          {rec.actions.map((action, j) => (
                            <li key={j}>✓ {action}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benchmark-Enriched Insights */}
            {(() => {
              const benchmarkRecs = getBenchmarkRecommendation(profitMargin, expenseRatio, business.category)
              return benchmarkRecs.length > 0 ? (
                <div className="analysis-box benchmark-insights-box">
                  <div className="box-header">
                    <h3>🏭 Benchmark Insights</h3>
                    <span className="benchmark-insight-badge">Reference</span>
                  </div>
                  <div className="recommendations-list">
                    {benchmarkRecs.map((text, i) => (
                      <div key={i} className="recommendation-item priority-info">
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="benchmark-disclaimer-inline">
                    Illustrative reference only — not official industry statistics.
                  </p>
                </div>
              ) : null
            })()}
          </>
        ) : null}
      </div>

      {/* Inventory Monitoring Section */}
      {(inventoryItems.length > 0 || lowStockItems.length > 0) && (
        <div className="inventory-section">
          <div className="section-header">
            <h2>📦 Inventory Monitor</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {lowStockItems.length > 0 && (
                <span className="low-stock-badge">{lowStockItems.length} Low Stock Alert{lowStockItems.length > 1 ? 's' : ''}</span>
              )}
              <button className="btn-secondary" onClick={onManageInventory} style={{ fontSize: '13px', padding: '8px 14px' }}>
                Manage Inventory
              </button>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="analysis-box alerts-box">
              <div className="box-header">
                <h3>⚠️ Low Stock Alerts</h3>
                <span className="issue-count">{lowStockItems.length}</span>
              </div>
              <div className="alerts-list">
                {lowStockItems.map((item, i) => (
                  <div key={i} className={`alert-item ${item.quantity <= 0 ? 'severity-critical' : 'severity-high'}`}>
                    <div className="alert-icon">
                      {item.quantity <= 0 ? '🔴' : '🟡'}
                    </div>
                    <div className="alert-content">
                      <strong>{item.name} {item.quantity <= 0 ? '— OUT OF STOCK' : '— LOW STOCK'}</strong>
                      <p>
                        Current: {item.quantity} units | Minimum: {item.minStock} units
                        {item.price ? ` | Unit Price: $${item.price.toFixed(2)}` : ''}
                      </p>
                      <div className="recommendation-action">
                        {item.quantity <= 0
                          ? `Urgent: Reorder ${item.name} immediately. Estimated restock cost: $${((item.minStock * 2) * (item.price || 0)).toFixed(2)}`
                          : `Reorder now. Need at least ${item.minStock - item.quantity} more units to reach minimum stock level.`
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Summary Table */}
          {inventoryItems.length > 0 && (
            <div className="analysis-box">
              <div className="box-header">
                <h3>📋 Inventory Overview</h3>
                <span className="rec-count">{inventoryItems.length} items</span>
              </div>
              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Min Stock</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item, i) => {
                      const isLow = item.quantity <= item.minStock;
                      const isOut = item.quantity <= 0;
                      return (
                        <tr key={i} className={isOut ? 'row-critical' : isLow ? 'row-warning' : ''}>
                          <td>{item.name}</td>
                          <td>{item.category || 'General'}</td>
                          <td>{item.quantity}</td>
                          <td>{item.minStock}</td>
                          <td>{item.price ? `$${item.price.toFixed(2)}` : '-'}</td>
                          <td>
                            <span className={`stock-status ${isOut ? 'status-critical' : isLow ? 'status-warning' : 'status-ok'}`}>
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {inventory && (
                <div className="inventory-summary">
                  <span>Total Items: <strong>{inventory.totalItems}</strong></span>
                  <span>Total Value: <strong>${inventory.totalValue?.toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Demo Scenarios Section */}
      <DemoScenarios onLoadDemo={onLoadDemo} loading={loading} />
    </div>
  )
}

// CSV Upload Screen Component
function CSVUploadScreen({ onUpload, loading, uploadStatus }) {
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvText(event.target.result)
    }
    reader.readAsText(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (csvText.trim()) {
      onUpload(csvText)
    }
  }

  const sampleFinancialCSV = `sales,expenses,employees
50000,22000,8
65000,28000,10`

  const sampleInventoryCSV = `name,quantity,min_stock,price,category
Widget A,150,20,25.00,Electronics
Widget B,8,15,45.00,Electronics
Gadget X,75,10,120.00,Accessories
Gadget Y,3,10,89.99,Accessories
Part Z,200,50,8.50,Components`

  return (
    <div className="screen setup-screen">
      <div className="setup-container" style={{ maxWidth: '600px' }}>
        <h2>Upload CSV Data</h2>
        <p style={{ color: '#718096', marginBottom: '16px', fontSize: '14px' }}>
          Upload a CSV file with your business financial data or inventory data.
          BizGuard AI will automatically detect the type and import it.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Choose CSV File</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              disabled={loading}
              className="csv-file-input"
            />
            {fileName && <p style={{ fontSize: '13px', color: '#48bb78', marginTop: '4px' }}>Selected: {fileName}</p>}
          </div>

          <div className="form-group">
            <label>Or Paste CSV Data</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste your CSV data here..."
              disabled={loading}
              rows={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !csvText.trim()}>
            {loading ? (
              <span className="btn-loading"><span className="loading-spinner-sm"></span> Processing...</span>
            ) : 'Upload & Import'}
          </button>
        </form>

        {/* Upload Status */}
        {uploadStatus && uploadStatus.success && (
          <div className="upload-success" style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f0fff4',
            border: '1px solid #c6f6d5',
            borderRadius: '8px',
            fontSize: '13px',
          }}>
            <strong style={{ color: '#22543d' }}>Upload successful!</strong>
            <p style={{ color: '#276749', margin: '4px 0 0' }}>
              Type: {uploadStatus.type} | Rows imported: {uploadStatus.rowCount}
            </p>
            {uploadStatus.validation?.warnings?.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#c05621' }}>
                {uploadStatus.validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Sample Data Templates */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Sample CSV Templates</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setCsvText(sampleFinancialCSV); setFileName('sample_financial.csv') }}
              disabled={loading}
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              Financial Data Sample
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setCsvText(sampleInventoryCSV); setFileName('sample_inventory.csv') }}
              disabled={loading}
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              Inventory Data Sample
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
            Supported columns: sales/revenue, expenses/costs, profit, employees | name, quantity/stock, min_stock, price, category
          </p>
        </div>
      </div>
    </div>
  )
}

// AI Assistant Screen Component
function AssistantScreen({ messages, input, onInputChange, onSend, loading }) {
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const messagesDiv = document.querySelector('.messages-container')
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  }, [messages])

  return (
    <div className="screen assistant-screen">
      <div className="assistant-container">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <p>👋 Hi! I'm BizGuard AI. Ask me anything about your business.</p>
              <p>I can help with sales, expenses, profit analysis, and growth strategies.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-content typing">
                <span className="thinking-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
                AI is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-row">
            <input
              type="text"
              placeholder="Ask about your business..."
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              disabled={loading}
              maxLength={5000}
              aria-label="Type your question about your business"
            />
            <button
              className="btn-send"
              onClick={onSend}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? '⏳' : 'Send'}
            </button>
          </div>
          <div className="input-footer">
            <span className="input-hint">Press Enter to send</span>
            {input.length > 0 && (
              <span className={`char-counter ${input.length > 4500 ? 'warn' : ''}`}>
                {input.length}/5000
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Inventory Management Screen Component
function InventoryManagementScreen({ apiUrl, onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '', quantity: '', minStock: '', price: '', category: ''
  })

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${apiUrl}/inventory`)
      const data = await response.json()
      if (response.ok && data.success) {
        setItems(data.data.inventory || [])
      } else {
        setError(data.message || 'Failed to load inventory')
      }
    } catch (err) {
      console.error('Error loading inventory:', err)
      setError('Failed to connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const saveInventory = async (inventoryArray) => {
    try {
      setSaving(true)
      setError('')
      const response = await fetch(`${apiUrl}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: inventoryArray }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setItems(data.data || inventoryArray)
        return true
      } else {
        setError(data.message || 'Failed to save inventory')
        return false
      }
    } catch (err) {
      console.error('Error saving inventory:', err)
      setError('Failed to connect to server.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Item name is required')
      return
    }
    const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0)
    const newItem = {
      id: maxId + 1,
      name: formData.name.trim(),
      quantity: parseInt(formData.quantity) || 0,
      minStock: parseInt(formData.minStock) || 0,
      price: parseFloat(formData.price) || 0,
      category: formData.category.trim() || 'General',
    }
    const success = await saveInventory([...items, newItem])
    if (success) {
      closeForm()
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Item name is required')
      return
    }
    const updated = items.map(item =>
      item.id === editingItem.id ? {
        ...item,
        name: formData.name.trim(),
        quantity: parseInt(formData.quantity) || 0,
        minStock: parseInt(formData.minStock) || 0,
        price: parseFloat(formData.price) || 0,
        category: formData.category.trim() || 'General',
      } : item
    )
    const success = await saveInventory(updated)
    if (success) {
      closeForm()
    }
  }

  const handleDelete = async (itemId) => {
    if (saving) return
    const item = items.find(i => i.id === itemId)
    if (!window.confirm(`Delete "${item?.name}"? This cannot be undone.`)) return
    const updated = items.filter(i => i.id !== itemId)
    await saveInventory(updated)
  }

  const openEditForm = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      quantity: item.quantity,
      minStock: item.minStock,
      price: item.price,
      category: item.category || '',
    })
    setShowForm(true)
    setError('')
  }

  const openAddForm = () => {
    setEditingItem(null)
    setFormData({ name: '', quantity: '', minStock: '', price: '', category: '' })
    setShowForm(true)
    setError('')
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingItem(null)
    setFormData({ name: '', quantity: '', minStock: '', price: '', category: '' })
    setError('')
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const lowStockCount = items.filter(i => i.quantity <= i.minStock).length
  const outOfStockCount = items.filter(i => i.quantity <= 0).length
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0)

  if (loading) {
    return (
      <div className="screen inventory-mgmt-screen">
        <div className="inventory-mgmt-container">
          <div style={{ textAlign: 'center', padding: '48px', color: '#718096' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <p>Loading inventory...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen inventory-mgmt-screen">
      <div className="inventory-mgmt-container">
        {/* Header */}
        <div className="inventory-mgmt-header">
          <div>
            <h2>📦 Inventory Management</h2>
            <p className="inventory-mgmt-subtitle">
              {items.length} item{items.length !== 1 ? 's' : ''}
              {lowStockCount > 0 && <span className="inv-stat-warning"> · {lowStockCount} low stock</span>}
              {outOfStockCount > 0 && <span className="inv-stat-danger"> · {outOfStockCount} out of stock</span>}
              <span className="inv-stat-info"> · Total value: ${totalValue.toLocaleString()}</span>
            </p>
          </div>
          <div className="inventory-mgmt-actions">
            <button className="btn-secondary" onClick={onBack} style={{ fontSize: '13px', padding: '8px 14px' }}>
              ← Back to Dashboard
            </button>
            <button className="btn-primary" onClick={openAddForm} disabled={saving} style={{ width: 'auto', padding: '8px 16px' }}>
              + Add Item
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Empty State */}
        {items.length === 0 && !showForm && (
          <div className="inventory-empty">
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
            <h3>No Inventory Items</h3>
            <p>Add items to start tracking your stock levels.</p>
            <button className="btn-primary" onClick={openAddForm} style={{ width: 'auto', padding: '10px 20px' }}>
              + Add First Item
            </button>
          </div>
        )}

        {/* Inventory Table */}
        {items.length > 0 && (
          <div className="inventory-mgmt-table-wrap">
            <table className="inventory-table inventory-mgmt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Min Stock</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isLow = item.quantity <= item.minStock
                  const isOut = item.quantity <= 0
                  return (
                    <tr key={item.id} className={isOut ? 'row-critical' : isLow ? 'row-warning' : ''}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.category || 'General'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.minStock}</td>
                      <td>{item.price ? `$${item.price.toFixed(2)}` : '-'}</td>
                      <td>
                        <span className={`stock-status ${isOut ? 'status-critical' : isLow ? 'status-warning' : 'status-ok'}`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td>
                        <div className="inv-action-btns">
                          <button
                            className="inv-btn-edit"
                            onClick={() => openEditForm(item)}
                            disabled={saving}
                            title="Edit item"
                          >
                            Edit
                          </button>
                          <button
                            className="inv-btn-delete"
                            onClick={() => handleDelete(item.id)}
                            disabled={saving}
                            title="Delete item"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="inventory-modal-overlay" onClick={(e) => {
            if (saving) return
            if (e.target.classList.contains('inventory-modal-overlay')) closeForm()
          }}>
            <div className="inventory-modal">
              <div className="inventory-modal-header">
                <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                <button className="inventory-modal-close" onClick={closeForm} disabled={saving}>×</button>
              </div>
              <form onSubmit={editingItem ? handleUpdate : handleAdd}>
                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Widget A"
                    required
                    autoFocus
                    disabled={saving}
                  />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleFormChange}
                      min="0"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Stock</label>
                    <input
                      type="number"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleFormChange}
                      min="0"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Unit Price ($)</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleFormChange}
                      min="0"
                      step="0.01"
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      placeholder="e.g. Electronics"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="inventory-modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeForm} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving} style={{ width: 'auto', padding: '10px 20px' }}>
                    {saving ? (
                      <span className="btn-loading"><span className="loading-spinner-sm"></span> Saving...</span>
                    ) : (editingItem ? 'Update Item' : 'Add Item')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App