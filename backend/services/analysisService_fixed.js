// Business analysis service
// Analyzes business data and detects risks/issues

function analyzeBusiness(business) {
  const issues = [];
  const recommendations = [];

  if (!business) return { issues, recommendations };

  const { sales, expenses, profit, profitMargin, expenseRatio } = business;

  // Risk Detection and Analysis
  
  // 1. Profit Margin Analysis
  if (profitMargin < 10) {
    issues.push({
      severity: "high",
      title: "Critically Low Profit Margin",
      description: `Your profit margin is only ${profitMargin}%. This leaves little room for growth or unexpected costs.`,
    });
    recommendations.push({
      priority: "high",
      title: "Optimize Expenses",
      description: "Review all operational expenses. Look for areas to reduce costs without compromising quality.",
      actions: [
        "Renegotiate supplier contracts",
        "Reduce overhead costs",
        "Improve operational efficiency",
      ],
    });
  } else if (profitMargin < 20) {
    issues.push({
      severity: "medium",
      title: "Below-Average Profit Margin",
      description: `Your profit margin is ${profitMargin}%, which is below industry average for most businesses.`,
    });
  } else {
    recommendations.push({
      priority: "info",
      title: "Healthy Profit Margin",
      description: `Your profit margin of ${profitMargin}% is healthy. Focus on maintaining this while growing revenue.`,
    });
  }

  // 2. Expense Analysis
  if (expenseRatio > 80) {
    issues.push({
      severity: "high",
      title: "Expenses Consuming Most Revenue",
      description: `${expenseRatio}% of your revenue goes to expenses. This is unsustainable.`,
    });
  } else if (expenseRatio > 60) {
    issues.push({
      severity: "medium",
      title: "High Expense Ratio",
      description: `${expenseRatio}% of revenue goes to expenses. There may be optimization opportunities.`,
    });
  }

  // 3. Absolute Profit Check
  if (profit < 5000) {
    issues.push({
      severity: "medium",
      title: "Low Absolute Profit",
      description: "Your absolute profit is relatively low. Consider strategies to increase revenue or reduce costs.",
    });
  }

  // 4. Revenue Analysis
  if (sales < 20000) {
    recommendations.push({
      priority: "high",
      title: "Focus on Revenue Growth",
      description: "Your sales are relatively low. Consider strategies to increase customer acquisition or average transaction value.",
      actions: [
        "Enhance marketing efforts",
        "Improve customer retention",
        "Increase average order value",
        "Expand product/service offerings",
      ],
    });
  }

  // 5. Break-Even Analysis
  if (sales === expenses) {
    issues.push({
      severity: "high",
      title: "Break-Even Status",
      description: "You're operating at break-even with no profit. Immediate action needed.",
    });
  }

  return {
    issues,
    recommendations,
  };
}

module.exports = {
  analyzeBusiness,
};
