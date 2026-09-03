const express = require("express");
const { askAI } = require("../services/aiService");
const { analyzeBusiness } = require("../services/analysisService");
const Business = require("../services/unifiedService");
const { processCSV } = require("../services/csvService");

const router = express.Router();

// AI Chat endpoint
// POST /api/ai/ask
// Request: { message: string, businessContext: object }
router.post("/ask", async (req, res) => {
  try {
    const { message, businessContext } = req.body;

    // Validate message
    if (!message) {
      return res.status(400).json({
        success: false,
        error: "MISSING_MESSAGE",
        message: "Message is required",
        code: 400,
      });
    }

    if (typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "INVALID_MESSAGE_TYPE",
        message: "Message must be a string",
        code: 400,
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "EMPTY_MESSAGE",
        message: "Message cannot be empty",
        code: 400,
      });
    }

    // Validate message length (max 5000 characters)
    const MAX_MESSAGE_LENGTH = 5000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: "MESSAGE_TOO_LONG",
        message: `Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
        code: 400,
      });
    }

    // If business context is missing/invalid, use a safe default instead of rejecting
    let safeContext = {};
    if (businessContext && typeof businessContext === "object") {
      safeContext = businessContext;
    }

    // Call AI service
    const answer = await askAI(message, safeContext);

    res.json({
      success: true,
      answer,
      code: 200,
    });
  } catch (error) {
    console.error("AI Error:", error);

    // Distinguish between error types — never expose stack traces or internals
    const statusCode = error.message?.includes("API") ? 503 : 500;
    const errorCode = error.message?.includes("API") ? "AI_SERVICE_UNAVAILABLE" : "AI_PROCESSING_ERROR";

    // Log full error for developers, but only send safe message to client
    console.error("AI Error details:", error.message);

    res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: "Failed to process AI request. Please try again.",
      code: statusCode,
    });
  }
});

// Get default business data
router.get("/business", async (req, res) => {
  try {
    const business = await Business.getOrCreateDefault();
    const metrics = Business.getMetrics(business);
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Error getting business:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get business data",
    });
  }
});

// Save business data
router.post("/business", async (req, res) => {
  try {
    const { name, category, sales, expenses, profit, employees } = req.body;

    if (!name || sales === undefined || expenses === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, sales, expenses",
      });
    }

    // Validate string field lengths to prevent abuse
    if (typeof name !== 'string' || name.length > 200) {
      return res.status(400).json({ success: false, message: 'Business name must be a string under 200 characters.' });
    }
    if (category !== undefined && (typeof category !== 'string' || category.length > 100)) {
      return res.status(400).json({ success: false, message: 'Category must be a string under 100 characters.' });
    }

    // Validate numeric fields are finite numbers within safe range
    const MAX_SAFE = 1e12;
    const numSales = Number(sales);
    const numExpenses = Number(expenses);
    if (!Number.isFinite(numSales) || Math.abs(numSales) > MAX_SAFE) {
      return res.status(400).json({ success: false, message: 'Sales must be a valid number.' });
    }
    if (!Number.isFinite(numExpenses) || Math.abs(numExpenses) > MAX_SAFE) {
      return res.status(400).json({ success: false, message: 'Expenses must be a valid number.' });
    }
    if (profit !== undefined && (!Number.isFinite(Number(profit)) || Math.abs(Number(profit)) > MAX_SAFE)) {
      return res.status(400).json({ success: false, message: 'Profit must be a valid number.' });
    }
    if (employees !== undefined && (!Number.isFinite(Number(employees)) || Number(employees) < 0 || Number(employees) > 100000)) {
      return res.status(400).json({ success: false, message: 'Employees must be a valid non-negative number.' });
    }

    // Profit is optional - will be calculated if not provided
    const business = await Business.save("default", {
      name,
      category,
      sales,
      expenses,
      profit, // Can be undefined - will be calculated in businessService
      employees,
    });

    const metrics = Business.getMetrics(business);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Error saving business:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save business data",
    });
  }
});

// Get business metrics
router.get("/metrics", async (req, res) => {
  try {
    const business = (await Business.get("default")) || (await Business.getOrCreateDefault());
    const metrics = Business.getMetrics(business);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Error getting metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get metrics",
    });
  }
});

// Analysis endpoint
router.post("/analyze", (req, res) => {
  try {
    const { businessContext } = req.body;
    
    if (!businessContext) {
      return res.status(400).json({
        success: false,
        message: "Business context is required",
      });
    }

    // Validate businessContext is a plain object (not array, string, etc.)
    if (typeof businessContext !== 'object' || Array.isArray(businessContext)) {
      return res.status(400).json({
        success: false,
        message: "Business context must be an object",
      });
    }

    // Sanitize numeric fields to prevent NaN/Infinity from entering analysis
    const safeCtx = { ...businessContext };
    for (const key of ['sales', 'expenses', 'profit', 'employees']) {
      if (safeCtx[key] !== undefined) {
        const num = Number(safeCtx[key]);
        safeCtx[key] = Number.isFinite(num) ? num : 0;
      }
    }

    const analysis = analyzeBusiness(safeCtx);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Analysis Error:", error);

    res.status(500).json({
      success: false,
      message: "Analysis failed",
    });
  }
});

// --- CSV Upload Endpoint ---
// POST /api/ai/upload
// Request: { csvData: string } (raw CSV text)
router.post("/upload", async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== "string") {
      return res.status(400).json({
        success: false,
        message: "CSV data is required. Send as { csvData: '...' }",
      });
    }

    // Size limit: 5MB of CSV text (prevents memory exhaustion)
    const MAX_CSV_SIZE = 5 * 1024 * 1024;
    if (csvData.length > MAX_CSV_SIZE) {
      return res.status(413).json({
        success: false,
        message: `CSV data too large. Maximum ${MAX_CSV_SIZE / (1024 * 1024)}MB allowed.`,
      });
    }

    const result = processCSV(csvData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "CSV processing failed",
        validation: result.validation,
      });
    }

    // If financial data, update the business
    if (result.type === "financial" && result.businessData) {
      const existingBiz = await Business.get("default");
      const business = await Business.save("default", {
        ...result.businessData,
        name: existingBiz?.name || "My Business",
        category: existingBiz?.category || "General",
      });
      const metrics = Business.getMetrics(business);

      return res.json({
        success: true,
        type: "financial",
        data: metrics,
        rowCount: result.rowCount,
        validation: result.validation,
      });
    }

    // If inventory data, update inventory
    if (result.type === "inventory" && result.inventoryData) {
      const inventory = await Business.setInventory("default", result.inventoryData);

      return res.json({
        success: true,
        type: "inventory",
        data: inventory,
        rowCount: result.rowCount,
        validation: result.validation,
      });
    }

    res.json({
      success: true,
      type: result.type,
      validation: result.validation,
    });
  } catch (error) {
    console.error("CSV Upload Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process CSV upload",
    });
  }
});

// --- Inventory Endpoints ---
// GET /api/ai/inventory
router.get("/inventory", async (req, res) => {
  try {
    const business = (await Business.get("default")) || (await Business.getOrCreateDefault());
    const inventory = await Business.getInventory("default");
    const lowStock = await Business.getLowStockItems("default");

    res.json({
      success: true,
      data: {
        inventory,
        lowStockItems: lowStock,
        totalItems: inventory.length,
        lowStockCount: lowStock.length,
      },
    });
  } catch (error) {
    console.error("Error getting inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get inventory",
    });
  }
});

// POST /api/ai/inventory
router.post("/inventory", async (req, res) => {
  try {
    const { inventory } = req.body;

    if (!inventory || !Array.isArray(inventory)) {
      return res.status(400).json({
        success: false,
        message: "Inventory must be an array of items",
      });
    }

    // Limit inventory size to prevent abuse
    const MAX_INVENTORY_ITEMS = 10000;
    if (inventory.length > MAX_INVENTORY_ITEMS) {
      return res.status(413).json({
        success: false,
        message: `Inventory too large. Maximum ${MAX_INVENTORY_ITEMS} items allowed.`,
      });
    }

    // Validate each item has at least a name
    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ success: false, message: `Inventory item at index ${i} is not a valid object.` });
      }
      if (item.name !== undefined && (typeof item.name !== 'string' || item.name.length > 200)) {
        return res.status(400).json({ success: false, message: `Item name at index ${i} must be a string under 200 characters.` });
      }
    }

    const updatedInventory = await Business.setInventory("default", inventory);

    res.json({
      success: true,
      data: updatedInventory,
    });
  } catch (error) {
    console.error("Error saving inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save inventory",
    });
  }
});

module.exports = router;