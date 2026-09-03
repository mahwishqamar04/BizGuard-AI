# BizGuard AI - Quick Start Guide

## 🚀 Start Both Backend & Frontend

### In Terminal 1 - Start Backend
```bash
cd backend
npm install     # First time only
npm start
```
Expected output: `BizGuard AI backend running on http://localhost:5000`

### In Terminal 2 - Start Frontend
```bash
cd frontend
npm install     # First time only
npm run dev
```
Expected output: `➜ Local: http://localhost:5173/`

### Open Browser
Navigate to: **http://localhost:5173**

---

## 📊 What You'll See

### Welcome Screen
- Feature showcase
- Click "Get Started"

### Business Setup Screen
- Pre-filled sample data (Sales: $45K, Expenses: $18K, Profit: $27K)
- Edit if desired
- Click "Save & Continue"

### Dashboard Screen
- **Business Header:** Shows name, category, employees, and health score (0-100)
- **4 Metric Cards:** Sales, Expenses, Profit, Profit Margin
- **Workflow Visualization:** Shows Analyze → Detect → Explain → Recommend stages
- **Alerts Section:** Shows any detected business issues
- **Recommendations:** Shows AI recommendations with action items
- **Analyze Button:** Click to refresh analysis

### AI Assistant Screen
- Chat interface for asking business questions
- Type your question and press Enter or click Send
- Get AI insights about your business

---

## ✨ Key Features

✅ **Dashboard** - Comprehensive business metrics at a glance
✅ **Health Score** - 0-100 score showing business health status
✅ **AI Analysis Workflow** - Visual Analyze → Detect → Explain → Recommend flow
✅ **Risk Alerts** - Highlights business problems and issues
✅ **Smart Recommendations** - AI-powered action items for improvement
✅ **AI Chat** - Ask anything about your business
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Professional UI** - Hackathon-ready presentation

---

## 📝 Files Changed

### Frontend Modified
1. **frontend/src/App.jsx** (Enhanced)
   - Added health score calculation
   - Enhanced dashboard layout
   - Added workflow visualization
   - Enhanced alerts section
   - Enhanced recommendations display
   
2. **frontend/src/App.css** (Enhanced)
   - New business header styling
   - Enhanced metric cards
   - Workflow container styles
   - Alert and recommendation styling
   - Improved responsive design
   - Better animations and transitions

3. **frontend/index.html** (Updated)
   - Better title and meta tags
   - Improved SEO

### Backend (No Changes Needed)
✅ Backend AI service ready at http://localhost:5000
✅ All endpoints working:
   - GET /api/ai/business
   - POST /api/ai/business
   - POST /api/ai/analyze
   - POST /api/ai/ask

---

## 🔧 Troubleshooting

### "Cannot connect to backend"
- Make sure backend is running in Terminal 1
- Check backend is on port 5000
- Try: `curl http://localhost:5000/`

### "Page looks broken"
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check browser console (F12) for errors

### "Analyze button doesn't work"
- Make sure backend is running
- Check browser console for network errors
- Verify you saved business data first

### "Chat not responding"
- Backend must be running
- Check network tab in DevTools (F12)
- Verify backend /api/ai/ask endpoint

---

## 💡 Tips

1. **Edit Business Data** - Click "Business" button to enter your own data
2. **Refresh Analysis** - Click "Re-Analyze" button to get updated insights
3. **Ask Questions** - Use "Ask AI" to get advice on specific business topics
4. **Try Scenarios** - Change numbers and see how analysis changes
5. **Mobile Testing** - Open on phone to test responsive design

---

## 📱 Responsive Design

The app works perfectly on:
- **Desktop** (1024px+): Full 4-column workflow view
- **Tablet** (768px-1024px): 2-column workflow view
- **Mobile** (< 768px): 1-column workflow view, optimized touch interface

Test responsive design using browser DevTools (F12 → Toggle device toolbar)

---

## 🎯 Demo Scenario

1. **Open Welcome Screen** - Showcase features
2. **Go to Setup** - Show form with sample data
3. **Save Business** - Demonstrate save process
4. **Show Dashboard** - Highlight metrics and health score
5. **Click Analyze** - Show Analyze → Detect → Explain → Recommend workflow
6. **Show Alerts** - Highlight detected issues
7. **Show Recommendations** - Explain action items
8. **Try Chat** - Ask "How can I reduce expenses?" or "What's my business health?"
9. **Responsive** - Show mobile view with DevTools

---

## ✅ Ready for Hackathon Demo

- ✅ No build errors
- ✅ No missing dependencies
- ✅ No console errors
- ✅ No authentication needed
- ✅ Sample data ready
- ✅ Professional UI
- ✅ Fully responsive
- ✅ Backend integrated
- ✅ AI insights working
- ✅ Chat interface ready

**All systems ready to go! 🚀**

---

## 📚 Complete Documentation

For detailed information, see:
- **FRONTEND_MVP_GUIDE.md** - Frontend implementation details
- **AI_INTEGRATION_TEST_GUIDE.md** - Backend AI service testing
- **README.md** - Project overview

---

## 🎬 Getting Started Steps

1. ✅ Install Node.js 18+ (if not already installed)
2. ✅ Open 2 terminal windows
3. ✅ Run backend in Terminal 1: `cd backend && npm start`
4. ✅ Run frontend in Terminal 2: `cd frontend && npm run dev`
5. ✅ Open browser to http://localhost:5173
6. ✅ See welcome screen
7. ✅ Click through all features
8. ✅ Ready to present! 🎉

Enjoy! 🛡️ BizGuard AI - Your Business Guardian
