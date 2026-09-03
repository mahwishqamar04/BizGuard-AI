
// BizGuard AI Service
// Supports Qwen (Alibaba Cloud) with intelligent mock fallback

const logger = {
  debug: (msg) => process.env.DEBUG_AI && console.log(`[AI DEBUG] ${msg}`),
  info: (msg) => console.log(`[AI INFO] ${msg}`),
  warn: (msg) => console.warn(`[AI WARN] ${msg}`),
  error: (msg) => console.error(`[AI ERROR] ${msg}`),
};

// Analyze business metrics and detect issues
function analyzeBusinessMetrics(businessContext) {
  // Sanitize numeric values to prevent NaN/Infinity
  const rawSales = parseFloat(businessContext.sales);
  const rawExpenses = parseFloat(businessContext.expenses);
  const rawProfit = parseFloat(businessContext.profit);
  const sales = Number.isFinite(rawSales) ? rawSales : 0;
  const expenses = Number.isFinite(rawExpenses) ? rawExpenses : 0;
  const profit = Number.isFinite(rawProfit) ? rawProfit : 0;

  const profitMargin = sales > 0 ? parseFloat(((profit / sales) * 100).toFixed(1)) : 0;
  const expenseRatio = sales > 0 ? parseFloat(((expenses / sales) * 100).toFixed(1)) : 0;
  const healthScore = profit > 0 && sales > 0 ? Math.min(100, parseFloat(((profit / sales) * 200).toFixed(1))) : 0;

  const analysis = {
    profitMargin,
    expenseRatio,
    hasLowMargin: sales > 0 ? (profit < sales * 0.1) : (profit <= 0),
    hasHighExpenses: expenses > sales * 0.6,
    isLossMaking: expenses > sales,
    isZeroSales: sales === 0,
    isBreakEven: profit === 0 && sales === 0,
    healthScore,
  };

  return analysis;
}

// Detect specific business issues
function detectIssues(businessContext, analysis) {
  const issues = [];
  
  if (analysis.isLossMaking) {
    issues.push("business is operating at a loss — expenses exceed revenue");
  }
  if (analysis.isZeroSales) {
    issues.push("no sales recorded — profit margin cannot be calculated");
  }
  if (analysis.hasLowMargin && !analysis.isZeroSales) {
    issues.push("critically low profit margin");
  }
  if (analysis.hasHighExpenses && !analysis.isLossMaking) {
    issues.push("expenses are consuming most revenue");
  }
  if (businessContext.profit === 0 && !analysis.isZeroSales && !analysis.isLossMaking) {
    issues.push("zero profit - break-even scenario");
  }
  
  return issues;
}

// Generate detailed business guardian response (mock)
function generateBusinessGuardianResponse(message, businessContext) {
  const msgLower = message.toLowerCase();
  const analysis = analyzeBusinessMetrics(businessContext);
  const issues = detectIssues(businessContext, analysis);

  // Safely format dollar amounts (never show NaN or Infinity)
  const fmtDollar = (val) => {
    const num = parseFloat(val);
    return Number.isFinite(num) ? num.toLocaleString() : '0';
  };
  const fmtPct = (val) => {
    const num = parseFloat(val);
    return Number.isFinite(num) ? num.toFixed(1) : '0.0';
  };

  // Analyze phase
  const analyzeSection = `
**Analyzing your business:**
- Sales: $${fmtDollar(businessContext.sales)}
- Expenses: $${fmtDollar(businessContext.expenses)}
- Profit: $${fmtDollar(businessContext.profit)}
- Profit Margin: ${analysis.isZeroSales ? 'N/A (no sales)' : fmtPct(analysis.profitMargin) + '%'}
- Expense Ratio: ${analysis.isZeroSales ? 'N/A (no sales)' : fmtPct(analysis.expenseRatio) + '%'}`;

  // Detect phase - identify problems
  let detectSection = "";
  if (issues.length > 0) {
    detectSection = `

**Issues Detected:**
${issues.map(issue => `- ${issue}`).join('\n')}`;
  } else {
    detectSection = `

**Status:** Your business appears financially stable.`;
  }

  // Explain & Recommend based on query
  let explainRecommendSection = "";

  if (msgLower.includes("expense") || msgLower.includes("cost")) {
    const ratioText = analysis.isZeroSales
      ? 'Expense ratio cannot be calculated because there are no sales.'
      : `Your expenses represent ${fmtPct(analysis.expenseRatio)}% of your revenue. This is ${analysis.expenseRatio > 60 ? "concerning" : "manageable"}.`;
    const lossText = analysis.isLossMaking
      ? '\n\n**Warning:** Your expenses exceed your sales. This is unsustainable and requires immediate action.'
      : '';

    explainRecommendSection = `

**Explanation:** ${ratioText}${lossText}

**Recommendations:**
1. Audit vendor contracts for rate reductions
2. Evaluate operational efficiency and automation opportunities
3. Consider outsourcing non-core activities
4. Review labor costs and staffing levels`;
} else if (msgLower.includes("profit")) {
  if (analysis.isLossMaking) {
    const lossAmount = fmtDollar(Math.abs(businessContext.profit));
    explainRecommendSection = `

**Explanation:** Your business is currently operating at a loss of $${lossAmount}. ${analysis.isZeroSales ? 'There are no sales recorded, so profit margin cannot be meaningfully calculated.' : `Your profit margin is ${fmtPct(analysis.profitMargin)}%, which means expenses are exceeding revenue.`} The immediate priority should be stabilizing costs and cash flow before investing in growth.

**Recommendations:**
1. Identify and reduce non-essential expenses immediately
2. Review pricing and increase prices where the market allows
3. Identify your highest-cost products, services, or operations and optimize them
4. Monitor cash flow closely and create a short-term cost reduction plan`;
  } else if (analysis.isZeroSales) {
    explainRecommendSection = `

**Explanation:** There are no sales recorded, so profit margin cannot be meaningfully calculated. Your reported profit is $${fmtDollar(businessContext.profit)}. Focus on generating revenue first.

**Recommendations:**
1. Focus on generating your first sales — marketing, outreach, or promotions
2. Track all revenue sources carefully
3. Keep expenses minimal until revenue is established
4. Reassess profit margins once sales begin`;
  } else if (analysis.profitMargin < 10) {
    explainRecommendSection = `

**Explanation:** Your profit margin is ${fmtPct(analysis.profitMargin)}%. Your business is profitable, but the margin is low, so expense control and pricing should be prioritized.

**Recommendations:**
1. Review your largest expense categories and identify costs that can be reduced
2. Review pricing and consider increasing prices where appropriate
3. Focus on products or services with stronger profit margins
4. Monitor profit margin monthly and set a target for improvement`;
  } else if (analysis.profitMargin <= 20) {
    explainRecommendSection = `

**Explanation:** Your profit margin is ${fmtPct(analysis.profitMargin)}%. Your business is profitable, but there is room to improve profitability.

**Recommendations:**
1. Review major operating expenses
2. Improve pricing and focus on higher-margin products or services
3. Increase customer retention and repeat purchases
4. Monitor profit margin and expenses every month`;
  } else {
    explainRecommendSection = `

**Explanation:** Your profit margin is ${fmtPct(analysis.profitMargin)}%, which indicates a healthy level of profitability.

**Recommendations:**
1. Maintain your current expense discipline
2. Focus on sustainable revenue growth
3. Build financial reserves for unexpected challenges
4. Reinvest a portion of profits strategically into growth`;
  }
  } else if (msgLower.includes("sales") || msgLower.includes("revenue")) {
    const salesText = analysis.isZeroSales
      ? 'There are currently no sales recorded. Generating revenue should be the top priority.'
      : `Current sales of $${fmtDollar(businessContext.sales)} provide the foundation for your business. Growth requires strategic market expansion.`;

    explainRecommendSection = `

**Explanation:** ${salesText}

**Recommendations:**
1. Expand customer acquisition through targeted marketing
2. Increase customer lifetime value through retention programs
3. Develop new product/service offerings
4. Explore market expansion opportunities`;
  } else if (msgLower.includes("grow") || msgLower.includes("growth")) {
    const marginText = analysis.isZeroSales ? 'N/A (no sales yet)' : `${fmtPct(analysis.profitMargin)}%`;
    const growthWarning = analysis.isLossMaking
      ? '\n\n**Caution:** You are currently operating at a loss. Stabilize finances before pursuing aggressive growth.'
      : '';

    explainRecommendSection = `

**Explanation:** To grow sustainably, you must balance revenue growth with expense management. Your current profit margin is ${marginText}.${growthWarning}

**Recommendations:**
1. Establish clear growth targets (e.g., 20% annual growth)
2. Invest profits into marketing and customer acquisition
3. Optimize operations to maintain margins during growth
4. Monitor metrics monthly and adjust strategy accordingly`;
  } else if (msgLower.includes("risk") || msgLower.includes("problem")) {
    const riskLevel = analysis.healthScore > 50 ? "moderate" : "elevated";
    const riskDetail = analysis.isLossMaking
      ? 'Your business is operating at a loss, which significantly increases financial risk.'
      : `Your health score: ${analysis.healthScore}/100.`;

    explainRecommendSection = `

**Explanation:** Risk assessment shows ${riskLevel} risk level. ${riskDetail}

**Recommendations:**
1. Build cash reserves equivalent to 3-6 months of operating expenses
2. Diversify revenue streams to reduce concentration risk
3. Implement cost controls to protect margins during downturns
4. Regular financial monitoring and scenario planning`;
  } else {
    // Default response following Analyze → Detect → Explain → Recommend
    const marginDisplay = analysis.isZeroSales ? 'N/A — no sales to calculate margin' : `${fmtPct(analysis.profitMargin)}% margin`;
    const lossNote = analysis.isLossMaking ? '\n\n**Urgent:** Your business is operating at a loss. Reducing expenses and/or increasing revenue should be your top priority.' : '';

    explainRecommendSection = `

**General Business Guardian Assessment:**
Your business is generating $${fmtDollar(businessContext.profit)} profit on $${fmtDollar(businessContext.sales)} in sales (${marginDisplay}).${lossNote}

**Key Recommendations:**
1. ${analysis.isZeroSales ? 'Focus on generating your first sales revenue' : analysis.profitMargin > 20 ? "Maintain your healthy margins while focusing on growth" : "Improve margins by reducing expenses or increasing prices"}
2. Build financial reserves for unexpected challenges
3. Monitor key metrics (sales, expenses, profit margin) monthly
4. Reinvest profits strategically into growth`;
  }

  return analyzeSection + detectSection + explainRecommendSection;
}


// Call Qwen API via Alibaba Cloud DashScope
async function callQwenAPI(prompt) {
  const apiKey = process.env.QWEN_API_KEY || process.env.ALIBABA_API_KEY;
  
  if (!apiKey) {
    logger.debug("No Qwen API key found - will use mock implementation");
    return null;
  }

  logger.info("Attempting Qwen API call...");

  try {
    // Alibaba Cloud DashScope API endpoint
    // Documentation: https://help.aliyun.com/document_detail/2712195.html
    const response = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-turbo",
          input: {
            messages: [
              {
                role: "system",
                content: `You are BizGuard AI, an AI business guardian for small businesses.

Your role is to analyze business data and provide actionable guidance using this workflow:

**ANALYZE:** Understand the business metrics (sales, expenses, profit)
**DETECT:** Identify issues, risks, and opportunities
**EXPLAIN:** Clearly explain what the metrics mean
**RECOMMEND:** Provide specific, actionable recommendations

Always:
- Be direct and clear about business risks
- Provide specific numbers and percentages
- Give actionable, practical advice
- Focus on what the business owner can actually do
- Be empathetic but realistic about challenges`,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          },
          parameters: {
            max_tokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      // Log only status and first 200 chars — never log full external responses
      logger.error(`Qwen API HTTP ${response.status}: ${errorData.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const answer = data.output?.text || null;
    
    if (answer) {
      logger.info("Qwen API response received successfully");
      return answer;
    } else {
      logger.warn("Qwen API returned empty response");
      return null;
    }
  } catch (error) {
    logger.error(`Qwen API call failed: ${error.message}`);
    return null;
  }
}

// Main AI function: Analyze business and provide guidance
async function askAI(message, businessContext = {}) {
  // Validate input
  if (!message || typeof message !== "string") {
    throw new Error("Message must be a non-empty string");
  }

  // Safely handle missing/invalid business context — use defaults instead of throwing
  const ctx = (businessContext && typeof businessContext === "object") ? businessContext : {};

  // Ensure numeric values — guard against NaN, Infinity, null, non-numeric
  const rawSales = parseFloat(ctx.sales);
  const rawExpenses = parseFloat(ctx.expenses);
  const rawProfit = parseFloat(ctx.profit);
  const sales = Number.isFinite(rawSales) ? rawSales : 0;
  const expenses = Number.isFinite(rawExpenses) ? rawExpenses : 0;
  const profit = Number.isFinite(rawProfit) ? rawProfit : (sales - expenses);

  const sanitizedContext = {
    ...ctx,
    sales,
    expenses,
    profit,
  };

  // Build prompt with BizGuard personality
  const prompt = `
Business Context:
- Business Name: ${sanitizedContext.name || "Unknown"}
- Category: ${sanitizedContext.category || "Unknown"}
- Monthly Sales: $${sales}
- Monthly Expenses: $${expenses}
- Monthly Profit: $${profit}
- Employees: ${sanitizedContext.employees || 0}

Owner Question: "${message}"

Using the Analyze → Detect → Explain → Recommend workflow, provide business guidance.`;

  logger.debug(`Processing question: "${message}"`);
  logger.debug(`Business context: Sales=$${sales}, Expenses=$${expenses}, Profit=$${profit}`);

  try {
    // Attempt to use Qwen API
    const qwenResponse = await callQwenAPI(prompt);
    if (qwenResponse) {
      logger.info("Returning Qwen API response");
      return qwenResponse;
    }
  } catch (error) {
    logger.error(`Error calling Qwen API: ${error.message}`);
  }

  // Fallback to business guardian mock implementation
  logger.info("Using mock implementation (no API key or API failed)");
  const mockResponse = generateBusinessGuardianResponse(message, sanitizedContext);
  return mockResponse;
}

module.exports = {
  askAI,
  analyzeBusinessMetrics,
  detectIssues,
};