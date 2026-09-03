// Business data model
// For MVP, we'll store in memory. Later can be replaced with DB.

class Business {
  constructor() {
    this.businesses = new Map();
  }

  // Create or update business
  save(businessId, data) {
    // Use Number.isFinite to guard against NaN, Infinity, -Infinity
    const rawSales = parseFloat(data.sales);
    const rawExpenses = parseFloat(data.expenses);
    const sales = Number.isFinite(rawSales) ? rawSales : 0;
    const expenses = Number.isFinite(rawExpenses) ? rawExpenses : 0;
    // Calculate profit if not provided
    let profit;
    if (data.profit !== undefined) {
      const rawProfit = parseFloat(data.profit);
      profit = Number.isFinite(rawProfit) ? rawProfit : (sales - expenses);
    } else {
      profit = sales - expenses;
    }

    const existing = this.businesses.has(businessId) ? this.businesses.get(businessId) : null;

    const business = {
      id: businessId,
      name: data.name || "My Business",
      category: data.category || "General",
      sales: sales,
      expenses: expenses,
      profit: profit,
      products: data.products || (existing ? existing.products : []),
      employees: Number.isFinite(parseFloat(data.employees)) ? parseFloat(data.employees) : 0,
      inventory: data.inventory || (existing ? existing.inventory : []),
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date(),
    };

    this.businesses.set(businessId, business);
    return business;
  }

  // Get business
  get(businessId) {
    return this.businesses.get(businessId) || null;
  }

  // Get or create default business with sample inventory
  getOrCreateDefault() {
    const defaultId = "default";
    if (!this.businesses.has(defaultId)) {
      return this.save(defaultId, {
        name: "Sample Business",
        category: "Retail",
        sales: 45000,
        expenses: 18000,
        profit: 27000,
        employees: 5,
        inventory: [
          { id: 1, name: "Widget A", quantity: 150, minStock: 20, price: 25.00, category: "Electronics" },
          { id: 2, name: "Widget B", quantity: 8, minStock: 15, price: 45.00, category: "Electronics" },
          { id: 3, name: "Gadget X", quantity: 75, minStock: 10, price: 120.00, category: "Accessories" },
          { id: 4, name: "Gadget Y", quantity: 3, minStock: 10, price: 89.99, category: "Accessories" },
          { id: 5, name: "Part Z", quantity: 200, minStock: 50, price: 8.50, category: "Components" },
          { id: 6, name: "Part W", quantity: 12, minStock: 25, price: 15.00, category: "Components" },
        ],
      });
    }
    return this.businesses.get(defaultId);
  }

  // Calculate metrics
  getMetrics(business) {
    if (!business) return null;

    const { sales, expenses, profit } = business;
    const profitMargin = sales > 0 ? ((profit / sales) * 100).toFixed(2) : 0;
    const expenseRatio = sales > 0 ? ((expenses / sales) * 100).toFixed(2) : 0;

    return {
      ...business,
      profitMargin: parseFloat(profitMargin),
      expenseRatio: parseFloat(expenseRatio),
    };
  }

  // --- Inventory Methods ---

  // Set inventory for a business
  setInventory(businessId, inventory) {
    const business = this.businesses.get(businessId);
    if (!business) return null;

    business.inventory = inventory.map((item, idx) => {
      const rawQty = parseInt(item.quantity);
      const rawMin1 = parseInt(item.minStock);
      const rawMin2 = parseInt(item.min_stock);
      const rawPrice = parseFloat(item.price);
      return {
        id: item.id || idx + 1,
        name: (typeof item.name === 'string' && item.name.trim()) ? item.name.trim() : `Item ${idx + 1}`,
        quantity: Number.isFinite(rawQty) ? rawQty : 0,
        minStock: Number.isFinite(rawMin1) ? rawMin1 : (Number.isFinite(rawMin2) ? rawMin2 : 0),
        price: Number.isFinite(rawPrice) ? rawPrice : 0,
        category: (typeof item.category === 'string' && item.category.trim()) ? item.category.trim() : "General",
      };
    });
    business.updatedAt = new Date();

    this.businesses.set(businessId, business);
    return business.inventory;
  }

  // Get inventory for a business
  getInventory(businessId) {
    const business = this.businesses.get(businessId);
    if (!business) return [];
    return business.inventory || [];
  }

  // Get low-stock items
  getLowStockItems(businessId) {
    const inventory = this.getInventory(businessId);
    return inventory.filter(item => item.quantity <= item.minStock);
  }
}

// Export singleton instance
module.exports = new Business();
