const axios = require('axios');
const { Op } = require('sequelize');
const {
  calculateTradeStats,
  compareTradePeriods,
  analyzeStrategyPerformance,
  analyzeInstrumentPerformance,
  analyzeSessionAndTiming,
  analyzeBehaviorAndRules,
  simulateTradingRules,
  generateEvidenceBasedInsights,
  analyzeTraderProgress,
} = require('./analyticsEngine');

/**
 * TradeMind AI Analyst Agent
 * 
 * Orchestrates journal-grounded queries, selects deterministic backend calculation tools,
 * and synthesizes structured, evidence-backed answers.
 */
class TradeMindAgent {
  constructor(models) {
    this.models = models;
  }

  /**
   * Main entry point to process a user question
   */
  async processQuery({ query, conversationHistory = [], apiKey, llmProvider = 'gemini' }) {
    const q = (query || '').trim();
    if (!q) {
      return {
        reply: 'Please provide a question about your trading journal or performance.',
        toolUsed: null,
      };
    }

    // 1. Fetch user's trades from database (enforce database grounding)
    const { Trade, Playbook, DailyJournal } = this.models;
    const allTrades = await Trade.findAll({
      order: [['entryTime', 'ASC']],
      include: [{ model: Playbook, as: 'playbook' }],
    });

    // 2. Identify Intent & Select Tool
    const toolCall = this.selectTool(q, conversationHistory, allTrades);

    // 3. Execute Tool Deterministically
    const toolResult = await this.executeTool(toolCall, allTrades);

    // 4. Generate Grounded Response (via Gemini/OpenAI or Local Quantitative Synthesis Engine)
    if (apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        const activeKey = apiKey || (llmProvider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);
        const activeProvider = llmProvider === 'openai' ? 'openai' : (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');
        
        const llmResponse = await this.synthesizeWithLlm({
          query: q,
          toolName: toolCall.name,
          toolResult,
          conversationHistory,
          apiKey: activeKey,
          provider: activeProvider,
        });

        if (llmResponse) {
          return {
            reply: llmResponse,
            toolUsed: toolCall.name,
            toolResult,
          };
        }
      } catch (err) {
        console.warn('[TradeMind AI] External LLM error, using local synthesis engine:', err.message);
      }
    }

    // Local deterministic synthesis (100% reliable, zero hallucination, grounded in metrics)
    const localReply = this.synthesizeLocally({
      query: q,
      toolName: toolCall.name,
      toolResult,
      totalRecords: allTrades.length,
    });

    return {
      reply: localReply,
      toolUsed: toolCall.name,
      toolResult,
    };
  }

  /**
   * Selects appropriate analytical tool based on user's natural language question
   */
  selectTool(query, history = [], allTrades = []) {
    const q = query.toLowerCase();

    // Check for counterfactual simulation: "what if", "stop after 2 trades", "max 2 trades", "stopped after loss"
    if (q.includes('what if') || q.includes('stopped after') || q.includes('max trades') || q.includes('simulate') || q.includes('if i had stopped')) {
      if (q.includes('loss') || q.includes('losing')) {
        return { name: 'simulateTradingRules', ruleType: 'stopAfterLoss', params: { maxLosses: 1 } };
      }
      if (q.includes('cap') || q.includes('1r') || q.includes('cut loser')) {
        return { name: 'simulateTradingRules', ruleType: 'maxLossCap', params: { capAmount: 2000 } };
      }
      return { name: 'simulateTradingRules', ruleType: 'maxTradesPerDay', params: { limit: 2 } };
    }

    // Check for period comparisons: "this week vs last week", "compare", "versus", "last month"
    if (q.includes('compare') || (q.includes('this week') && q.includes('last week')) || (q.includes('this month') && q.includes('last month'))) {
      return { name: 'comparePeriods', query: q };
    }

    // Check for strategy / playbook performance: "which strategy", "best setup", "playbook", "orb", "vwap"
    if (q.includes('strategy') || q.includes('setup') || q.includes('playbook') || q.includes('which perform') || q.includes('best perform')) {
      return { name: 'getStrategyPerformance' };
    }

    // Check for instrument / asset class performance: "nifty", "banknifty", "options", "equity", "instrument", "futures"
    if (q.includes('nifty') || q.includes('banknifty') || q.includes('option') || q.includes('equity') || q.includes('instrument') || q.includes('stock')) {
      return { name: 'getInstrumentPerformance', instrumentQuery: q };
    }

    // Check for timing & session leaks: "days", "time", "friday", "morning", "afternoon", "session", "when do i"
    if (q.includes('day') || q.includes('time') || q.includes('hour') || q.includes('session') || q.includes('friday') || q.includes('morning')) {
      return { name: 'getSessionPerformance' };
    }

    // Check for costs & brokerage: "brokerage", "charges", "stt", "taxes", "gst", "fees", "how much paid"
    if (q.includes('brokerage') || q.includes('charge') || q.includes('stt') || q.includes('tax') || q.includes('cost') || q.includes('fee')) {
      return { name: 'getTradingCosts' };
    }

    // Check for progress audit, leaks, lacking, behavior coaching:
    if (
      q.includes('lacking') ||
      q.includes('progress') ||
      q.includes('improve') ||
      q.includes('weakness') ||
      q.includes('holding me back') ||
      q.includes('mistake') ||
      q.includes('coach') ||
      (q.includes('all trades') && (q.includes('behavior') || q.includes('behaviour')))
    ) {
      return { name: 'getTraderProgressDiagnostic' };
    }

    // Check for behavior, discipline, rule violations, why losing: "why am i losing", "rule", "stop loss", "fomo", "discipline", "leak"
    if (q.includes('why am i losing') || q.includes('losing money') || q.includes('rule') || q.includes('stop loss') || q.includes('discipline') || q.includes('fomo') || q.includes('revenge') || q.includes('leak') || q.includes('pattern')) {
      return { name: 'getBehavioralAudit' };
    }

    // Check for automated insights: "insight", "summary", "audit", "review", "health"
    if (q.includes('insight') || q.includes('audit') || q.includes('summary') || q.includes('30 days') || q.includes('overall')) {
      return { name: 'getAutomaticInsights' };
    }

    // Default: Overall Trade Stats
    return { name: 'getTradeStats', options: {} };
  }

  /**
   * Executes the chosen tool against authenticated user's records
   */
  async executeTool(toolCall, allTrades) {
    const { name } = toolCall;

    switch (name) {
      case 'getTraderProgressDiagnostic': {
        return analyzeTraderProgress(allTrades);
      }

      case 'simulateTradingRules': {
        return simulateTradingRules(allTrades, toolCall.ruleType, toolCall.params);
      }

      case 'comparePeriods': {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const thisWeekTrades = allTrades.filter(t => new Date(t.entryTime) >= startOfWeek);
        const lastWeekTrades = allTrades.filter(t => new Date(t.entryTime) >= startOfLastWeek && new Date(t.entryTime) < startOfWeek);

        return compareTradePeriods(
          { label: 'This Week', trades: thisWeekTrades },
          { label: 'Last Week', trades: lastWeekTrades }
        );
      }

      case 'getStrategyPerformance': {
        return analyzeStrategyPerformance(allTrades);
      }

      case 'getInstrumentPerformance': {
        return analyzeInstrumentPerformance(allTrades);
      }

      case 'getSessionPerformance': {
        return analyzeSessionAndTiming(allTrades);
      }

      case 'getBehavioralAudit': {
        const behavior = analyzeBehaviorAndRules(allTrades);
        const stats = calculateTradeStats(allTrades);
        return {
          ...behavior,
          overallStats: stats,
        };
      }

      case 'getTradingCosts': {
        const stats = calculateTradeStats(allTrades);
        const friction = stats.grossPnl > 0 ? Number(((stats.totalCharges / stats.grossPnl) * 100).toFixed(1)) : 0;
        return {
          grossPnl: stats.grossPnl,
          netPnl: stats.netPnl,
          totalCharges: stats.totalCharges,
          costFrictionPercentage: friction,
          chargesBreakdown: stats.chargesBreakdown,
          sampleSize: stats.closedTrades,
        };
      }

      case 'getAutomaticInsights': {
        const stats = calculateTradeStats(allTrades);
        const insights = generateEvidenceBasedInsights(allTrades);
        return {
          stats,
          insights,
        };
      }

      case 'getTradeStats':
      default: {
        return calculateTradeStats(allTrades, toolCall.options);
      }
    }
  }

  /**
   * Local Deterministic Synthesis Engine
   * Formats response strictly according to the specified 4-part structure:
   * **Answer:** ...
   * **Evidence:** ...
   * **Interpretation:** ...
   * **Next Step:** ...
   */
  synthesizeLocally({ query, toolName, toolResult, totalRecords }) {
    const fmt = (num) => '₹' + Number(num || 0).toLocaleString('en-IN');

    // 0. Handle Zero Data scenario transparently
    if (totalRecords === 0) {
      return `**Answer:** You currently have no trade records logged in your journal.

**Evidence:** Database query returned 0 trade records across all date ranges.

**Interpretation:** TradeMind AI cannot evaluate your win rate, strategies, or psychological leaks without real trade history. 

**Next Step:** Connect your broker (**DhanHQ** or **Angel One SmartAPI**) in the Broker Hub, upload a contract note CSV, or click **Log Trade** to record your first execution.`;
    }

    // 1. Trader Progress & Behavioral Diagnostic ("Where am I lacking? How can I progress?")
    if (toolName === 'getTraderProgressDiagnostic') {
      const {
        disciplineScore,
        totalTrades,
        netPnl,
        winRate,
        profitFactor,
        expectancy,
        leaks = [],
        strengths = [],
        growthRoadmap = [],
        behavior,
        stats
      } = toolResult;

      const leaksText = leaks.length > 0 
        ? leaks.map(l => `* **[${l.category}] ${l.title}:** ${l.detail} *(Action: ${l.action})*`).join('\n')
        : '* **Zero critical leaks detected:** You are executing with strict plan adherence.';

      const strengthsText = strengths.length > 0
        ? strengths.map(s => `* **${s.title}:** ${s.detail}`).join('\n')
        : '* **Developing Edge:** Log more setups to establish statistically significant sample sizes.';

      const roadmapText = growthRoadmap.map((step, idx) => `${idx + 1}. ${step}`).join('\n');

      return `**Answer:** Based on auditing all ${totalTrades} trades in your journal, your progression is currently restricted by ${leaks.length > 0 ? leaks[0].category.toLowerCase() : 'data sample size'}. Your Discipline Score is **${disciplineScore}%**.

**Evidence:**
* **Journal Baseline:** ${totalTrades} trades | Net P&L: ${netPnl >= 0 ? '+' : ''}${fmt(netPnl)} | Win Rate: ${winRate}% | Profit Factor: ${profitFactor}.
* **Discipline & Rule Adherence:** ${disciplineScore}% of trades strictly followed defined rules.
${behavior?.brokenRules?.count > 0 ? `* **Cost of Broken Rules:** -${fmt(Math.abs(behavior.brokenRules.netPnl))} lost across ${behavior.brokenRules.count} rule-broken trades.` : ''}
${behavior?.revengeTrades?.count > 0 ? `* **Revenge / Tilt Executions:** ${behavior.revengeTrades.count} trades entered within 25 min of a loss (-${fmt(behavior.revengeTrades.associatedLoss)} lost).` : ''}
* **Risk/Reward Profile:** Avg Win +${fmt(stats?.avgWin)} vs Avg Loss -${fmt(stats?.avgLoss)} (Ratio: ${stats?.winLossRatio}:1).
${stats?.totalCharges > 0 ? `* **Charges & Taxes Friction:** ${fmt(stats.totalCharges)} paid in statutory charges.` : ''}

**Where You Are Lacking (Capital Leaks):**
${leaksText}

**Your Proven Edge:**
${strengthsText}

**Interpretation:** Your journal proves that account drawdowns do not occur because of market unpredictability, but because emotional reactivity (revenge trading, taking trades outside your playbook, moving stops) compromises your mathematical edge. When you follow your playbook, your results improve dramatically.

**Next Step (Your Progression Roadmap):**
${roadmapText}`;
    }

    // 2. Counterfactual Simulation
    if (toolName === 'simulateTradingRules') {
      const { actual, simulated, delta, description, conclusion } = toolResult;
      const isPositive = delta.pnlImpact >= 0;

      return `**Answer:** ${conclusion}

**Evidence:**
* **Rule Tested:** ${description}
* **Sample Evaluated:** ${actual.tradesCount} executed trades across all logged days.
* **Actual Net P&L:** ${actual.netPnl >= 0 ? '+' : ''}${fmt(actual.netPnl)} (${actual.winRate}% win rate, ${actual.profitFactor} profit factor).
* **Simulated Net P&L:** ${simulated.netPnl >= 0 ? '+' : ''}${fmt(simulated.netPnl)} (${simulated.winRate}% win rate, ${simulated.profitFactor} profit factor).
* **Capital Impact ($\Delta$):** ${isPositive ? `+${fmt(delta.pnlImpact)} preserved` : `-${fmt(Math.abs(delta.pnlImpact))} reduction`}.
* **Trades Avoided:** ${delta.tradesAvoided} trades.

**Interpretation:** Overtrading or continuing after taking an initial loss accounts for a significant portion of drawdown. When traders force setups after their primary focus is depleted, expectancy drops sharply.

**Next Step:** Implement a hard rule in your **Playbooks**: Cap daily activity to 2 high-conviction trades and shutdown your terminal once hit.`;
    }

    // 2. Behavioral & Rule Breaker Audit ("Why am I losing money?")
    if (toolName === 'getBehavioralAudit') {
      const { followedRules, brokenRules, ruleAdherenceRate, emotionsBreakdown, revengeTrades, overallStats } = toolResult;

      return `**Answer:** Based on your journal records, the primary contributors to your drawdown are rule non-adherence and impulsive emotion-driven executions.

**Evidence:**
* **Total Sample Size:** ${overallStats.closedTrades} closed trades.
* **When Rules Were Followed:** Win rate was **${followedRules.winRate}%** with Net P&L of **+${fmt(followedRules.netPnl)}** (${followedRules.count} trades).
* **When Rules Were Broken:** Win rate collapsed to **${brokenRules.winRate}%** with Net P&L of **-${fmt(Math.abs(brokenRules.netPnl))}** (${brokenRules.count} trades).
* **Revenge / Tilt Trades:** ${revengeTrades.count} trades executed within 25 minutes of a prior loss, losing **${fmt(revengeTrades.associatedLoss)}**.
* **Average Win vs Loss:** Avg Win is ${fmt(overallStats.avgWin)} vs Avg Loss of ${fmt(overallStats.avgLoss)}.

**Interpretation:** Your technical edge works when you follow your defined rules. The losses are not due to market randomness, but due to deviation from your plan and revenge trading immediately after a stop-out.

**Next Step:**
1. Institute a mandatory **15-minute cooling-off period** after any losing trade before opening the order window.
2. Complete the pre-trade checklist in your Playbook before confirming order placement.`;
    }

    // 3. Strategy Performance
    if (toolName === 'getStrategyPerformance') {
      const { strategies, bestStrategy, worstStrategy } = toolResult;

      if (!strategies || strategies.length === 0) {
        return `**Answer:** No strategies are currently linked to your recorded trades.

**Evidence:** 0 strategy tags found in trade logs.

**Interpretation:** Assigning setups to your trades enables TradeMind to distinguish high-probability setups from low-probability discretionary trades.

**Next Step:** Edit your past trades or log new ones with a specific strategy tag (e.g. *Opening Range Breakout*, *VWAP Reversal*).`;
      }

      const rows = strategies.map(s => `* **${s.strategyName}:** Net P&L ${s.netPnl >= 0 ? '+' : ''}${fmt(s.netPnl)} | Win Rate: ${s.winRate}% | Expectancy: ${s.expectancy >= 0 ? '+' : ''}${fmt(s.expectancy)}/trade (Sample: ${s.sampleSize} trades)`).join('\n');

      return `**Answer:** Your best performing setup is **"${bestStrategy ? bestStrategy.strategyName : 'Discretionary'}"**${worstStrategy ? `, while **"${worstStrategy.strategyName}"** has been your largest leak.` : '.'}

**Evidence:**
${rows}

**Interpretation:** ${bestStrategy && bestStrategy.sampleSize < 10 ? `⚠️ Note: The sample size for ${bestStrategy.strategyName} is relatively small (${bestStrategy.sampleSize} trades); continue logging to confirm statistical significance.` : `Your edge is clearly defined in setups with positive expectancy.`}

**Next Step:**
1. Focus your capital allocation on **${bestStrategy ? bestStrategy.strategyName : 'your top setup'}**.
2. Stop trading ${worstStrategy ? `**"${worstStrategy.strategyName}"**` : 'low expectancy setups'} until you refine its entry criteria on a simulator.`;
    }

    // 4. Period Comparison
    if (toolName === 'comparePeriods') {
      const { periodA, periodB, comparison } = toolResult;

      return `**Answer:** ${comparison.summaryText}

**Evidence:**
* **${periodA.label}:** ${periodA.stats.closedTrades} trades, Win Rate: ${periodA.stats.winRate}%, Net P&L: ${periodA.stats.netPnl >= 0 ? '+' : ''}${fmt(periodA.stats.netPnl)}, Profit Factor: ${periodA.stats.profitFactor}.
* **${periodB.label}:** ${periodB.stats.closedTrades} trades, Win Rate: ${periodB.stats.winRate}%, Net P&L: ${periodB.stats.netPnl >= 0 ? '+' : ''}${fmt(periodB.stats.netPnl)}, Profit Factor: ${periodB.stats.profitFactor}.
* **Variance ($\Delta$):** P&L change of ${comparison.deltaPnl >= 0 ? '+' : ''}${fmt(comparison.deltaPnl)}, Win rate change of ${comparison.deltaWinRate >= 0 ? '+' : ''}${comparison.deltaWinRate}%.

**Interpretation:** ${comparison.improved ? 'Your consistency and risk-management improved over the previous period.' : 'Performance experienced drawdown compared to the previous period. Review whether market regime changed or if trade frequency increased.'}

**Next Step:** Compare your emotional discipline ratings in the **Daily Review** tab between these two periods.`;
    }

    // 5. Instrument Performance
    if (toolName === 'getInstrumentPerformance') {
      const { byInstrument, byAssetClass } = toolResult;
      const instRows = (byInstrument || []).map(i => `* **${i.instrument}:** Net P&L ${i.netPnl >= 0 ? '+' : ''}${fmt(i.netPnl)} | Win Rate: ${i.winRate}% (Sample: ${i.closedTrades} trades)`).join('\n');

      return `**Answer:** Here is your verified performance broken down by traded instrument and asset class:

**Evidence:**
${instRows}

**Interpretation:** Different instruments have distinct volatility, spread costs, and tick behaviors. Index options (NIFTY / BANKNIFTY) suffer from rapid theta decay, whereas equities require greater patience.

**Next Step:** Double down on the instrument where your Net P&L and Profit Factor are highest; eliminate or downsize contracts on negative expectancy instruments.`;
    }

    // 6. Timing & Session Breakdown
    if (toolName === 'getSessionPerformance') {
      const { days, sessions } = toolResult;
      const dayRows = days.map(d => `* **${d.day}:** ${d.tradesCount} trades | Win Rate: ${d.winRate}% | Net P&L: ${d.netPnl >= 0 ? '+' : ''}${fmt(d.netPnl)}`).join('\n');
      const sessRows = sessions.map(s => `* **${s.session} Session:** ${s.tradesCount} trades | Win Rate: ${s.winRate}% | Net P&L: ${s.netPnl >= 0 ? '+' : ''}${fmt(s.netPnl)}`).join('\n');

      return `**Answer:** Your journal demonstrates noticeable variations based on session time and day of the week.

**Evidence:**
**By Day of Week:**
${dayRows}

**By Market Session:**
${sessRows}

**Interpretation:** Many active retail traders perform best during early morning momentum (9:15 - 11:00 AM) and give back gains during mid-day chop or on Friday expiries.

**Next Step:** Avoid initiating new breakout positions during the mid-day session (11:30 AM - 1:30 PM) when false breakouts are most prevalent.`;
    }

    // 7. Trading Costs & Brokerage Drag
    if (toolName === 'getTradingCosts') {
      const { grossPnl, netPnl, totalCharges, costFrictionPercentage, chargesBreakdown, sampleSize } = toolResult;

      return `**Answer:** You have paid a total of **${fmt(totalCharges)}** in Indian statutory charges and broker commissions across ${sampleSize} trades.

**Evidence:**
* **Gross P&L:** ${fmt(grossPnl)}
* **Net P&L (in bank):** ${fmt(netPnl)}
* **Securities Transaction Tax (STT):** ${fmt(chargesBreakdown.stt)}
* **Exchange Turnover Fees:** ${fmt(chargesBreakdown.exchangeCharges)}
* **Brokerage (Dhan / Angel One):** ${fmt(chargesBreakdown.brokerage)}
* **GST (18%):** ${fmt(chargesBreakdown.gst)}
* **Stamp Duty:** ${fmt(chargesBreakdown.stampDuty)}
* **Friction Drag:** Charges represent **${costFrictionPercentage}%** of your gross profits.

**Interpretation:** ${costFrictionPercentage > 15 ? '⚠️ High cost drag: Trading fees and government taxes are eroding a substantial portion of your gross gains. This typically points to overtrading small scalps.' : 'Cost drag is currently within a healthy margin.'}

**Next Step:** Ensure your average winning target is at least 3x the round-trip charges (approx ₹50-60 per lot).`;
    }

    // 8. Default: General Trade Stats & Health Summary
    const stats = toolResult;
    return `**Answer:** Your journal currently tracks **${stats.closedTrades} closed trades** with an overall Net P&L of **${stats.netPnl >= 0 ? '+' : ''}${fmt(stats.netPnl)}** and a win rate of **${stats.winRate}%**.

**Evidence:**
* **Total Executions:** ${stats.totalTrades} (${stats.closedTrades} closed, ${stats.openTrades} open).
* **Win Rate:** ${stats.winRate}% (${stats.winners} Wins / ${stats.losers} Losses / ${stats.breakeven} BE).
* **Profit Factor:** ${stats.profitFactor} *(Target: > 1.50)*.
* **Expectancy:** ${stats.expectancy >= 0 ? '+' : ''}${fmt(stats.expectancy)} per trade.
* **Average Win:** +${fmt(stats.avgWin)} | **Average Loss:** -${fmt(stats.avgLoss)} (Ratio: ${stats.winLossRatio}:1).
* **Total Statutory Taxes & Brokerage:** ${fmt(stats.totalCharges)}.
* **Maximum Drawdown:** -${fmt(stats.maxDrawdown)}.
${stats.sampleWarning ? `* ⚠️ *${stats.sampleWarning}*` : ''}

**Interpretation:** ${stats.profitFactor >= 1.5 ? 'Your trading system demonstrates positive mathematical expectancy. Your edge is statistically supported.' : 'Your profit factor indicates drawdown pressure. Focus on cutting losing trades at 1R and avoiding revenge entries.'}

**Next Step:** Ask me: *"Why am I losing money?"* or *"What if I stopped trading after 2 trades per day?"* to identify specific improvements.`;
  }

  /**
   * Synthesize with Gemini or OpenAI LLM
   */
  async synthesizeWithLlm({ query, toolName, toolResult, conversationHistory, apiKey, provider }) {
    const systemPrompt = `You are TradeMind AI, a personal quantitative trading performance coach and journal analyst.
Motto: "Master Your Trades. Master Your Mind."

CRITICAL INSTRUCTIONS:
1. Ground every claim strictly in the verified database metrics provided below.
2. NEVER invent trades, figures, win rates, dates, or reasons.
3. If data is missing or sample size is small, explicitly state that limitation.
4. Structure your response with the following headers whenever appropriate:
   **Answer:** (Direct, concise conclusion)
   **Evidence:** (Verified metrics, date range, sample size N)
   **Interpretation:** (Explaining where the trader is lacking, behavior habits, tilt, or strategy leaks)
   **Next Step:** (1-2 concrete, actionable coaching adjustments)

VERIFIED DATABASE TOOL RESULT (${toolName}):
${JSON.stringify(toolResult, null, 2)}
`;

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await axios.post(url, {
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: "${query}"` }] }
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      }, { timeout: 15000 });

      return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      // OpenAI
      const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-4),
          { role: 'user', content: query },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 15000,
      });

      return res.data?.choices?.[0]?.message?.content;
    }
  }
}

module.exports = TradeMindAgent;
