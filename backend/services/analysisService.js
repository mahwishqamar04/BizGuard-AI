// Business analysis service
// Comprehensive MVP business intelligence layer
// Analyzes business data, calculates health score, detects risks, and generates recommendations

/**
 * Calculate BizGuard Health Score (0-100)
 * Based on:
 * - Profit margin (0-40 points)
 * - Expense ratio efficiency (0-30 points)
 * - Profit positivity (0-30 points)
 */
function calculateHealthScore(sales, expenses, profit) {
  let score = 0;

  if (sales <= 0) return 0; // Invalid data

  const profitMargin = (profit / sales) * 100;
  const expenseRatio = (expenses / sales) * 100;

  // Profit margin score (0-40 points)
  // >20% = 40 points, >10% = 30 points, >0% = 15 points, <=0% = 0 points
  if (profitMargin > 20) {
    score += 40;
  } else if (profitMargin > 10) {
    score += 30;
  } else if (profitMargin > 0) {
    score += 15;
  }

  // Expense ratio score (0-30 points)
  // <60% = 30 points, <75% = 20 points, <85% = 10 points, >=85% = 0 points
  if (expenseRatio < 60) {
    score += 30;
  } else if (expenseRatio < 75) {
    score += 20;
  } else if (expenseRatio < 85) {
    score += 10;
  }

  // Profit positivity score (0-30 points)
  // Profit > sales*0.2 = 30, >0 = 20, <=0 = 0
  if (profit > sales * 0.2) {
    score += 30;
  } else if (profit > 0) {
    score += 20;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine health status based on score
 */
function getHealthStatus(score) {
  if (score >= 70) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 30) return "Fair";
  return "At Risk";
}

/**
 * Get health status color indicator
 */
function getHealthStatusColor(score) {
  if (score >= 70) return "success";
  if (score >= 50) return "info";
  if (score >= 30) return "warning";
  return "danger";
}

/**
 * Detect all business risks
 */
function detectRisks(sales, expenses, profit, profitMargin, expenseRatio) {
  const risks = [];

  // 1. Loss/Negative Profit Risk (Most Critical)
  if (profit <= 0) {
    risks.push({
      severity: "critical",
      title: "Operating at Loss",
      description: "Your business is operating at a loss. You're spending more than you earn.",
      recommendation: "Immediately review expenses and pricing. Consider cost reduction or price increases."
    });
  }

  // 2. Critical Expense/Revenue Risk
  if (expenses >= sales) {
    risks.push({
      severity: "critical",
      title: "Critical Expense/Revenue Risk",
      description: "Expenses equal or exceed revenue. This is unsustainable.",
      recommendation: "Reduce expenses urgently or increase revenue. This requires immediate action."
    });
  }

  // 3. Very Low Profit Margin
  if (profit > 0 && profitMargin < 5) {
    risks.push({
      severity: "high",
      title: "Very Low Profit Margin",
      description: `Profit margin is only ${profitMargin.toFixed(1)}%. Any cost increase or revenue drop threatens profitability.`,
      recommendation: "Focus on expense reduction. Every dollar saved becomes profit with this thin margin."
    });
  }

  // 4. Low Profit Margin
  if (profit > 0 && profitMargin >= 5 && profitMargin < 10) {
    risks.push({
      severity: "high",
      title: "Low Profit Margin",
      description: `Profit margin is ${profitMargin.toFixed(1)}%. Limited financial flexibility.`,
      recommendation: "Review largest expense categories and identify optimization opportunities."
    });
  }

  // 5. High Expense Ratio
  if (expenseRatio > 85) {
    risks.push({
      severity: "high",
      title: "Very High Expense Ratio",
      description: `${expenseRatio.toFixed(1)}% of revenue goes to expenses. Unsustainable cost structure.`,
      recommendation: "Conduct comprehensive expense audit. Identify and eliminate non-essential spending."
    });
  } else if (expenseRatio > 75) {
    risks.push({
      severity: "medium",
      title: "High Expense Ratio",
      description: `${expenseRatio.toFixed(1)}% of revenue goes to expenses.`,
      recommendation: "Focus on reducing unnecessary operating costs before increasing spending."
    });
  }

  // 6. Low Absolute Sales
  if (sales < 10000) {
    risks.push({
      severity: "medium",
      title: "Very Low Sales Volume",
      description: "Sales are below $10,000. Limited financial resources for operations and growth.",
      recommendation: "Prioritize revenue growth. Consider marketing, sales, or product expansion."
    });
  } else if (sales < 25000) {
    risks.push({
      severity: "medium",
      title: "Low Sales Volume",
      description: "Sales are relatively low, limiting financial resilience.",
      recommendation: "Implement growth strategies to increase customer base or transaction size."
    });
  }

  // 7. Low Absolute Profit
  if (profit > 0 && profit < 1000) {
    risks.push({
      severity: "medium",
      title: "Very Low Absolute Profit",
      description: "Profit is below $1,000. Minimal financial buffer for growth or emergencies.",
      recommendation: "Balance expense reduction with revenue growth to increase absolute profit."
    });
  } else if (profit > 0 && profit < 5000) {
    risks.push({
      severity: "low",
      title: "Low Absolute Profit",
      description: "Profit is below $5,000, limiting growth capacity.",
      recommendation: "Focus on scaling revenue or improving margins to increase profit."
    });
  }

  return risks;
}

/**
 * Generate actionable recommendations based on business metrics
 */
function generateRecommendations(sales, expenses, profit, profitMargin, expenseRatio, risks) {
  const recommendations = [];

  // Always recommend monitoring
  recommendations.push({
    priority: "high",
    title: "Monitor Key Metrics",
    description: "Track profit margin, expense ratio, and absolute profit monthly.",
    actions: [
      "Set up monthly financial reporting",
      "Compare month-over-month performance",
      "Identify trends early"
    ]
  });

  // Expense-focused recommendations
  if (expenseRatio > 60) {
    recommendations.push({
      priority: "high",
      title: "Optimize Expense Structure",
      description: `With ${expenseRatio.toFixed(1)}% of revenue going to expenses, cost optimization is critical.`,
      actions: [
        "Audit all major expense categories",
        "Renegotiate vendor and supplier contracts",
        "Identify and eliminate redundant costs",
        "Automate repetitive processes"
      ]
    });
  }

  // Profit margin recommendations
  if (profitMargin < 15) {
    recommendations.push({
      priority: "high",
      title: "Improve Profit Margin",
      description: `Current margin of ${profitMargin.toFixed(1)}% needs improvement for sustainability.`,
      actions: [
        "Review pricing strategy - consider price increases",
        "Identify high-margin products/services and focus there",
        "Reduce cost of goods sold (COGS)",
        "Eliminate low-margin offerings"
      ]
    });
  } else if (profitMargin >= 20) {
    recommendations.push({
      priority: "medium",
      title: "Maintain Healthy Margins",
      description: `Your margin of ${profitMargin.toFixed(1)}% is strong. Focus on growth without sacrificing profitability.`,
      actions: [
        "Invest profits into growth initiatives",
        "Scale operations while controlling costs",
        "Explore new revenue streams"
      ]
    });
  }

  // Revenue growth recommendations
  if (sales < 50000) {
    recommendations.push({
      priority: "high",
      title: "Accelerate Revenue Growth",
      description: "Revenue growth is essential for business resilience and profitability.",
      actions: [
        "Implement targeted marketing campaigns",
        "Focus on customer acquisition and retention",
        "Increase average transaction value",
        "Develop new product/service offerings"
      ]
    });
  }

  // Cash flow recommendations
  if (profit > 0 && profit < sales * 0.1) {
    recommendations.push({
      priority: "high",
      title: "Build Financial Reserves",
      description: "Limited profit provides little buffer for unexpected challenges.",
      actions: [
        "Set aside 3-6 months of operating expenses as reserves",
        "Build cash reserves gradually from profits",
        "Establish emergency fund before major investments"
      ]
    });
  }

  // Strategic growth for healthy businesses
  if (profitMargin >= 15 && expenseRatio < 75 && sales > 20000) {
    recommendations.push({
      priority: "medium",
      title: "Strategic Growth Investment",
      description: "Your financial health supports strategic investments for expansion.",
      actions: [
        "Invest in market expansion",
        "Develop new products/services",
        "Consider staffing increase",
        "Explore new distribution channels"
      ]
    });
  }

  return recommendations;
}

/**
 * Analyze inventory and detect low-stock items
 */
function analyzeInventory(inventory) {
  if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
    return { items: [], lowStockItems: [], totalValue: 0, totalItems: 0, alerts: [] };
  }

  const lowStockItems = [];
  const alerts = [];
  let totalValue = 0;
  let totalItems = 0;

  for (const item of inventory) {
    const qty = parseInt(item.quantity) || 0;
    const minStock = parseInt(item.minStock) || parseInt(item.min_stock) || 0;
    const price = parseFloat(item.price) || 0;

    totalValue += qty * price;
    totalItems += qty;

    if (qty <= 0) {
      alerts.push({
        severity: "critical",
        itemId: item.id,
        itemName: item.name,
        message: `${item.name} is OUT OF STOCK`,
        quantity: qty,
        minStock: minStock,
      });
      lowStockItems.push(item);
    } else if (qty <= minStock) {
      alerts.push({
        severity: "high",
        itemId: item.id,
        itemName: item.name,
        message: `${item.name} is LOW STOCK (${qty} remaining, minimum: ${minStock})`,
        quantity: qty,
        minStock: minStock,
      });
      lowStockItems.push(item);
    }
  }

  return {
    items: inventory,
    lowStockItems,
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalItems,
    alerts,
  };
}

/**
 * Comprehensive business analysis
 */
function analyzeBusiness(business) {
  if (!business) {
    return {
      healthScore: 0,
      healthStatus: "At Risk",
      healthStatusColor: "danger",
      risks: [],
      recommendations: [],
      inventory: null,
      metrics: {}
    };
  }

  const { sales = 0, expenses = 0, profit = 0 } = business;

  // Calculate metrics safely
  const profitMargin = sales > 0 ? (profit / sales) * 100 : 0;
  const expenseRatio = sales > 0 ? (expenses / sales) * 100 : 0;

  // Calculate health score
  const healthScore = calculateHealthScore(sales, expenses, profit);
  const healthStatus = getHealthStatus(healthScore);
  const healthStatusColor = getHealthStatusColor(healthScore);

  // Detect risks
  const risks = detectRisks(sales, expenses, profit, profitMargin, expenseRatio);

  // Analyze inventory if present
  const inventory = business.inventory ? analyzeInventory(business.inventory) : null;

  // Add inventory risks
  if (inventory && inventory.alerts.length > 0) {
    const criticalCount = inventory.alerts.filter(a => a.severity === "critical").length;
    const highCount = inventory.alerts.filter(a => a.severity === "high").length;

    if (criticalCount > 0) {
      risks.push({
        severity: "critical",
        title: "Out of Stock Items",
        description: `${criticalCount} item(s) are completely out of stock. This means lost sales and unhappy customers.`,
        recommendation: "Reorder immediately. Consider increasing safety stock levels for fast-moving items."
      });
    }
    if (highCount > 0) {
      risks.push({
        severity: "high",
        title: "Low Stock Alerts",
        description: `${highCount} item(s) are below minimum stock levels. Risk of stockout if demand increases.`,
        recommendation: "Review reorder points and place orders for low-stock items before they run out."
      });
    }
  }

  // Generate recommendations
  const recommendations = generateRecommendations(
    sales,
    expenses,
    profit,
    profitMargin,
    expenseRatio,
    risks
  );

  // Add inventory recommendations
  if (inventory && inventory.lowStockItems.length > 0) {
    recommendations.push({
      priority: "high",
      title: "Restock Inventory",
      description: `${inventory.lowStockItems.length} item(s) need reordering. Total inventory value: $${inventory.totalValue.toLocaleString()}.`,
      actions: inventory.lowStockItems.slice(0, 4).map(item =>
        `Reorder ${item.name} (current: ${item.quantity}, minimum: ${item.minStock})`
      )
    });
  }

  return {
    healthScore: Math.round(healthScore),
    healthStatus,
    healthStatusColor,
    risks,
    recommendations,
    inventory,
    metrics: {
      sales,
      expenses,
      profit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      expenseRatio: parseFloat(expenseRatio.toFixed(2))
    }
  };
}

module.exports = {
  analyzeBusiness,
  analyzeInventory,
  calculateHealthScore,
  getHealthStatus,
  detectRisks,
  generateRecommendations,
};
