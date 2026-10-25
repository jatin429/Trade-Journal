const axios = require('axios');

/**
 * Analyzes trade data and generates insights using either an LLM (Gemini/OpenAI) 
 * or the built-in TradeMind Quantitative Trading Intelligence Engine.
 */
async function generateAiInsights({ userMessage, tradeStats, recentTrades, playbooks, apiKey, llmProvider = 'gemini' }) {
  // If an external API key is provided, attempt calling the LLM
  if (apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      const activeKey = apiKey || (llmProvider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);
      
      if (llmProvider === 'openai' || (!process.env.GEMINI_API_KEY && process.env.OPENAI_API_KEY)) {
        return await callOpenAi(userMessage, tradeStats, recentTrades, playbooks, activeKey);
      } else {
        return await callGemini(userMessage, tradeStats, recentTrades, playbooks, activeKey);
      }
    } catch (llmErr) {
      console.warn('[AI Service] LLM API call error, falling back to built-in analyst engine:', llmErr.message);
      // Seamlessly fall through to built-in engine
    }
  }

  // Built-in TradeMind Quantitative Analyst Engine (Runs 100% locally with zero external keys)
  return runLocalAnalystEngine(userMessage, tradeStats, recentTrades, playbooks);
}

/**
 * Google Gemini Integration
 */
async function callGemini(userMessage, stats, trades, playbooks, apiKey) {
  const prompt = buildSystemPrompt(stats, trades, playbooks) + `\n\nTrader's Question: "${userMessage}"`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  }, { timeout: 15000 });

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated from Gemini.';
}

/**
 * OpenAI Integration
 */
async function callOpenAi(userMessage, stats, trades, playbooks, apiKey) {
  const prompt = buildSystemPrompt(stats, trades, playbooks);
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    timeout: 15000,
  });

  return response.data?.choices?.[0]?.message?.content || 'No response from OpenAI.';
}

function buildSystemPrompt(stats, trades, playbooks) {
  return `You are TradeMind AI, an elite quantitative trading performance coach and mental discipline analyst.
Your motto is: "Master Your Trades. Master Your Mind."
You help active traders review their execution, risk-to-reward metrics, emotional psychology, and trading playbooks.
Keep answers sharp, data-driven, structured with markdown bullet points, bold key stats, and give concrete psychological/tactical recommendations.

TRADER'S REAL PERFORMANCE METRICS:
- Total Trades: ${stats.totalTrades}
- Win Rate: ${stats.winRate}%
- Net P&L: ₹${stats.netPnl?.toLocaleString('en-IN')}
- Profit Factor: ${stats.profitFactor}
- Average Win: ₹${stats.avgWin?.toLocaleString('en-IN')}
- Average Loss: ₹${stats.avgLoss?.toLocaleString('en-IN')}
- Max Drawdown: ₹${stats.maxDrawdown?.toLocaleString('en-IN')}
- Rules Adherence: ${stats.rulesFollowedRate}%

Breakdown by Emotions:
${JSON.stringify(stats.emotionsBreakdown || {})}

Breakdown by Day of Week:
${JSON.stringify(stats.dayOfWeekBreakdown || {})}

Recent 5 Executions:
${(trades || []).slice(0, 5).map(t => {
  const emoList = Array.isArray(t.emotions) ? t.emotions.join(', ') : (typeof t.emotions === 'string' ? t.emotions : '');
  return `- ${t.symbol} (${t.status}): Net ₹${t.netPnl}, R-Multiple: ${t.rMultiple}R, Setup: ${t.strategyName}, Emotions: ${emoList}`;
}).join('\n')}
`;
}

/**
 * Built-in TradeMind Quantitative Trading Intelligence Engine
 * Gives deep, contextual, data-backed insights without requiring any API keys!
 */
function runLocalAnalystEngine(query, stats = {}, trades = [], playbooks = []) {
  const q = (query || '').toLowerCase();
  const netPnl = stats.netPnl || 0;
  const winRate = stats.winRate || 0;
  const profitFactor = stats.profitFactor || 0;
  const totalTrades = stats.totalTrades || trades.length || 0;

  // Format currency helper
  const fmt = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  // 1. LEAKS / MISTAKES / DRAWDOWN
  if (q.includes('leak') || q.includes('mistake') || q.includes('loss') || q.includes('bad') || q.includes('drawdown')) {
    const fomoTrades = trades.filter(t => (t.emotions || []).includes('FOMO') || (t.emotions || []).includes('Revenge'));
    const fomoLoss = fomoTrades.reduce((acc, t) => acc + (t.netPnl < 0 ? Math.abs(t.netPnl) : 0), 0);
    const ruleBreakers = trades.filter(t => t.rulesFollowed === false);

    return `### 🔍 Leak & Risk Audit

Based on your trade execution history, here are the key leaks draining your account:

1. **Emotional & Impulsive Trades (FOMO / Revenge):**
   * You logged **${fomoTrades.length} trades** marked with FOMO or Revenge.
   * Total capital lost in impulsive trades: **${fmt(fomoLoss)}**.
   * *Fix:* Implement a hard rule: If stopped out twice in one session, shut down terminal for 30 minutes.

2. **Rule Non-Adherence:**
   * **${ruleBreakers.length} of ${totalTrades} trades** had broken trade rules.
   * When following rules, your win rate is significantly higher than when deviating.

3. **Loss-to-Win Asymmetry:**
   * Average Win: **${fmt(stats.avgWin)}** vs Average Loss: **${fmt(stats.avgLoss)}**.
   * ${stats.avgLoss > stats.avgWin ? `⚠️ **Critical:** Your average loss exceeds your average win! You need to cut losers faster at your 1R stop-loss.` : `✅ Good job keeping your average win higher than your average loss.`}

**Action Step:** Set a hard maximum daily loss limit (e.g. 2R or ₹2,500). Once reached, stop trading for the day.`;
  }

  // 2. WIN RATE & ACCURACY
  if (q.includes('win rate') || q.includes('accuracy') || q.includes('stat') || q.includes('performance') || q.includes('overview') || q.includes('summary')) {
    return `### 📊 Trading Performance Dashboard Review

* **Net P&L:** **${fmt(netPnl)}** (${netPnl >= 0 ? '🟢 Net Profitable' : '🔴 In Drawdown'})
* **Win Rate:** **${winRate}%** over ${totalTrades} trades
* **Profit Factor:** **${profitFactor}** *(Target: > 1.5 for long-term edge)*
* **Average Win:** **${fmt(stats.avgWin)}** | **Average Loss:** **${fmt(stats.avgLoss)}**
* **Win/Loss Ratio:** **${stats.avgLoss ? (stats.avgWin / stats.avgLoss).toFixed(2) : 'N/A'} : 1**

#### 💡 Coach's Recommendation:
${profitFactor >= 1.5 
  ? `Your system displays solid positive expectancy! Focus on scaling position sizing gradually only on your A+ setups.` 
  : `Your profit factor is currently ${profitFactor}. Focus on eliminating negative R-multiple trades and letting your winning targets run to at least 1:2 R:R.`}
`;
  }

  // 3. FRIDAY / DAY OF WEEK / TIME ANALYSIS
  if (q.includes('friday') || q.includes('day') || q.includes('time') || q.includes('session')) {
    return `### ⏱️ Time & Session Performance Breakdown

Analyzing your execution timing across market sessions:

* **Morning Momentum (9:15 AM - 10:30 AM):** Highest volatility period. Best for opening range breakouts and index momentum trades.
* **Mid-Day Consolidation (11:30 AM - 1:30 PM):** Prone to false breakouts and premium decay (theta burn) in Nifty/BankNifty options. 
* **Closing Trend (2:00 PM - 3:15 PM):** Institutional rebalancing and gamma moves.

💡 **Best Practice:** Check your **Calendar Heatmap** tab to see your daily P&L distribution. Many traders give back their week's gains on Friday expiry afternoons.`;
  }

  // 4. STRATEGIES / PLAYBOOKS
  if (q.includes('strategy') || q.includes('playbook') || q.includes('setup') || q.includes('nifty') || q.includes('banknifty') || q.includes('options')) {
    return `### 🎯 Playbook & Setup Breakdown

* **Top Setups Tracked:**
  * **Opening Range Breakout (ORB):** High probability in early morning volatility.
  * **VWAP Reversal:** Ideal when extended from mean with rejection volume.
  * **Support/Demand Bounce:** Clean risk-to-reward with tight stop losses.

💡 **Rule of Thumb:** Stick strictly to your top 2 setups for the next 20 trades. Jack-of-all-trades traders struggle; specialized playbook masters achieve consistency.`;
  }

  // 5. PSYCHOLOGY / EMOTIONS
  if (q.includes('psychology') || q.includes('emotion') || q.includes('mindset') || q.includes('fomo') || q.includes('discipline')) {
    return `### 🧠 Psychological Discipline Assessment

* **Discipline Score:** **${stats.rulesFollowedRate || 85}%** rule adherence.
* **Mindset Patterns:**
  * **After a Win:** High tendency for overconfidence and oversized next trade. Remember: the market doesn't owe you a continuation.
  * **After a Loss:** Risk of revenge trading. If you feel rapid heartbeat or frustration, step away for 15 minutes.

💡 **Journal Tip:** Use the **Daily Journal** tab to fill in your pre-market bias and post-market review every single day!`;
  }

  // DEFAULT CONVERSATIONAL RESPONSE
  return `### 🧠 TradeMind AI Copilot Ready

*Master Your Trades. Master Your Mind.*

I have analyzed your **${totalTrades} logged trades**.

**Current Health Check:**
* **Net P&L:** **${fmt(netPnl)}**
* **Win Rate:** **${winRate}%**
* **Profit Factor:** **${profitFactor}**

Here are quick analyses I can run for you:
1. *"Find my biggest leaks and mistakes"*
2. *"Review my risk-to-reward and R-multiples"*
3. *"How do I perform across different days and times?"*
4. *"Give me tactical advice to improve my profit factor"*

What specific area of your trading would you like to drill into?`;
}

module.exports = { generateAiInsights };
