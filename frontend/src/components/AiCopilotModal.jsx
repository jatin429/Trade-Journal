import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  Brain, 
  Clock, 
  HelpCircle,
  Key,
  Sliders,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  ShieldAlert,
  Percent,
  Play
} from 'lucide-react';
import { askAiCopilot, getAiInsights, simulateAiRules } from '../services/api';

export default function AiCopilotModal({ isOpen, onClose, initialTab = 'chat', initialQuery = null }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(initialTab || 'chat'); // 'chat' | 'simulate' | 'insights'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `### 🧠 TradeMind AI Analyst Ready

*Master Your Trades. Master Your Mind.*

I am your personal quantitative trading journal analyst and progress coach. Every answer I provide is strictly calculated from your verified journal records. I evaluate your behavioral discipline, revenge trades, strategy expectancy, and capital leaks.

**Select a diagnostic audit below or ask me any question about your journal:**`,
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Simulation State
  const [simRuleType, setSimRuleType] = useState('maxTradesPerDay');
  const [simLimit, setSimLimit] = useState(2);
  const [simCapAmount, setSimCapAmount] = useState(2000);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Automatic Insights State
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const quickPrompts = [
    { label: '🚀 Where am I lacking? (Progress Audit)', query: 'Where am I lacking by considering all trades and my behavior? How can I progress?' },
    { label: '📉 Why am I losing money?', query: 'Why am I losing money?' },
    { label: '🛑 What if max 2 trades/day?', query: 'What would my results look like if I had stopped trading after two trades per day?' },
    { label: '⚡ Revenge & Tilt Leaks', query: 'Am I taking revenge trades after a loss, and what is it costing me?' },
    { label: '🎯 Best vs Worst Strategies', query: 'Which trading strategy performs best for me, and which is leaking capital?' },
    { label: '⚖️ Avg Win vs Avg Loss Ratio', query: 'What is my average winning trade versus my average losing trade?' },
    { label: '⏱️ Most Profitable Days & Times', query: 'Which days or times are most profitable for me?' },
    { label: '💸 Brokerage & Statutory Taxes', query: 'How much have I paid in brokerage and other trading charges?' },
    { label: '⚠️ Stop-Loss Rule Adherence', query: 'Am I following my stop-loss rules?' },
  ];

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (typeof initialQuery === 'string' && initialQuery.trim()) {
      handleSend(initialQuery.trim());
    }
  }, [initialQuery]);

  // Fetch insights when switching to Insights tab
  useEffect(() => {
    if (activeTab === 'insights') {
      loadInsights();
    }
  }, [activeTab]);

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await getAiInsights();
      setInsights(res.insights || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const params = simRuleType === 'maxTradesPerDay' 
        ? { limit: parseInt(simLimit, 10) }
        : simRuleType === 'maxLossCap' 
          ? { capAmount: parseFloat(simCapAmount) }
          : { maxLosses: 1 };

      const res = await simulateAiRules({ ruleType: simRuleType, params });
      setSimResult(res.simulation);
    } catch (err) {
      alert('Error running simulation: ' + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSend = async (queryText) => {
    const rawText = typeof queryText === 'string' ? queryText : inputQuery;
    const text = typeof rawText === 'string' ? rawText.trim() : '';
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askAiCopilot({
        message: text,
        conversationHistory: historyPayload,
        apiKey: apiKey || undefined,
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          toolUsed: res.toolUsed,
          toolResult: res.toolResult,
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error consulting TradeMind AI: ${err.response?.data?.error || err.message}`,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      zIndex: 120,
      display: 'flex',
      justifyContent: 'flex-end',
    }} onClick={onClose}>
      
      <div 
        style={{
          width: '100%',
          maxWidth: '640px',
          height: '100%',
          background: '#090d16',
          borderLeft: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(139, 92, 246, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
            }}>
              <Brain size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>TradeMind AI Analyst</h3>
                <span className="badge badge-ai" style={{ fontSize: '0.65rem' }}>Grounded in Journal</span>
              </div>
              <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                Master Your Trades. Master Your Mind.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
              title="LLM Settings (Gemini / OpenAI)"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* View Mode Switcher (Chat vs Rule Simulator vs Insights) */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '4px 16px',
          gap: '8px',
        }}>
          {[
            { id: 'chat', label: 'Journal Analyst', icon: Bot },
            { id: 'simulate', label: 'Rule Simulator', icon: Sliders },
            { id: 'insights', label: 'Evidence Insights', icon: Lightbulb },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  color: active ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  fontSize: '0.775rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={active ? '#c084fc' : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Optional Settings Panel */}
        {showSettings && (
          <div style={{
            padding: '16px 24px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Key size={13} color="#8b5cf6" />
              Optional External LLM Key (Google Gemini / OpenAI)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                placeholder="Paste Gemini or OpenAI API Key (or leave empty for built-in analyst)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.75rem' }}
              />
              <button onClick={() => setShowSettings(false)} className="btn btn-secondary btn-sm">
                Done
              </button>
            </div>
            <p style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '4px' }}>
              TradeMind uses deterministic calculations on your MySQL database. If no external key is supplied, the built-in Quantitative Analyst Engine answers with full mathematical rigor.
            </p>
          </div>
        )}

        {/* --- VIEW 1: CHAT & GROUNDED ANALYST --- */}
        {activeTab === 'chat' && (
          <>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}>
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: isUser ? '85%' : '98%',
                      background: isUser ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' : 'rgba(255, 255, 255, 0.04)',
                      border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '16px 18px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {!isUser && msg.toolUsed && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '10px',
                        padding: '2px 8px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '4px',
                        fontSize: '0.675rem',
                        color: '#c084fc',
                        fontWeight: 600,
                      }}>
                        <span>Tool Executed: {msg.toolUsed}</span>
                      </div>
                    )}

                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {typeof msg.content === 'string' ? msg.content : (typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content))}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span className="pulse-dot" style={{ background: '#8b5cf6' }} />
                  <span>Querying journal records and calculating verified statistics...</span>
                </div>
              )}
            </div>

            {/* Quick Question Chips */}
            <div style={{
              padding: '10px 20px',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              background: 'rgba(0, 0, 0, 0.25)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qp.query)}
                  disabled={loading}
                  style={{
                    whiteSpace: 'nowrap',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    color: '#c084fc',
                    borderRadius: '999px',
                    padding: '5px 11px',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#090d16',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}>
              <input
                type="text"
                placeholder="Ask TradeMind about win rates, leaks, stop losses, costs..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading}
                className="input-field"
                style={{ borderRadius: '10px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputQuery.trim() || loading}
                className="btn btn-ai"
                style={{ padding: '10px 16px', borderRadius: '10px' }}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}

        {/* --- VIEW 2: COUNTERFACTUAL RULE SIMULATOR --- */}
        {activeTab === 'simulate' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 800 }}>
                Counterfactual Rule Simulator
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Test "What If" discipline rules against your historical trades to see exactly how much capital you would have preserved.
              </p>
            </div>

            {/* Rule Selector Card */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Select Rule Hypothesis to Test
                </label>
                <select
                  value={simRuleType}
                  onChange={(e) => setSimRuleType(e.target.value)}
                  className="input-field"
                >
                  <option value="maxTradesPerDay">What if I capped trades to N per day?</option>
                  <option value="stopAfterLoss">What if I stopped trading after 1 loss per day?</option>
                  <option value="maxLossCap">What if every loss was strictly capped at 1R?</option>
                </select>
              </div>

              {simRuleType === 'maxTradesPerDay' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Max Trades Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={simLimit}
                    onChange={(e) => setSimLimit(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>
              )}

              {simRuleType === 'maxLossCap' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Max Loss Threshold (₹)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={simCapAmount}
                    onChange={(e) => setSimCapAmount(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>
              )}

              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                className="btn btn-ai"
                style={{ width: '100%', marginTop: '6px' }}
              >
                <Play size={16} />
                <span>{simLoading ? 'Running Simulation Engine...' : 'Run Simulation on Journal Data'}</span>
              </button>
            </div>

            {/* Simulation Results Display */}
            {simResult && (
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Simulation Outcome</span>
                  <span className={`badge ${simResult.delta?.improved ? 'badge-win' : 'badge-loss'}`}>
                    {simResult.delta?.improved ? 'Capital Preserved' : 'Reduced Gains'}
                  </span>
                </div>

                <div style={{
                  background: simResult.delta?.improved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  border: `1px solid ${simResult.delta?.improved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  borderRadius: '10px',
                  padding: '14px',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Net P&L Impact:</div>
                  <div style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: simResult.delta?.improved ? '#10b981' : '#f43f5e',
                  }}>
                    {simResult.delta?.pnlImpact >= 0 ? `+₹${simResult.delta?.pnlImpact.toLocaleString('en-IN')}` : `-₹${Math.abs(simResult.delta?.pnlImpact).toLocaleString('en-IN')}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    Avoided {simResult.delta?.tradesAvoided} overtraded fills
                  </div>
                </div>

                {/* Comparison Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Actual Recorded:</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      ₹{simResult.actual?.netPnl.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {simResult.actual?.tradesCount} trades • {simResult.actual?.winRate}% Win
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Simulated Rule:</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
                      ₹{simResult.simulated?.netPnl.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {simResult.simulated?.tradesCount} trades • {simResult.simulated?.winRate}% Win
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                  {simResult.conclusion}
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 3: AUTOMATED EVIDENCE INSIGHTS --- */}
        {activeTab === 'insights' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 800 }}>
                Automated Evidence Insights
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Statistically supported patterns and behavioral leaks discovered across your trade records.
              </p>
            </div>

            {insightsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8' }}>
                <span className="pulse-dot" style={{ background: '#8b5cf6', marginRight: '8px' }} />
                <span>Auditing journal data...</span>
              </div>
            ) : insights.length > 0 ? (
              insights.map((ins, i) => {
                const isLeak = ins.type === 'LEAK' || ins.type === 'COST_DRAG' || ins.severity === 'HIGH';
                const isPositive = ins.type === 'EDGE' || ins.type === 'HEALTH';

                return (
                  <div
                    key={i}
                    className="glass-panel"
                    style={{
                      padding: '18px',
                      borderLeft: `4px solid ${isLeak ? '#f43f5e' : isPositive ? '#10b981' : '#38bdf8'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                        {ins.title}
                      </span>
                      <span className={`badge ${isLeak ? 'badge-loss' : isPositive ? 'badge-win' : 'badge-be'}`}>
                        {ins.type}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {ins.description}
                    </p>

                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.725rem',
                      color: '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div><strong style={{ color: '#ffffff' }}>Evidence:</strong> {ins.evidence}</div>
                      {ins.recommendation && (
                        <div><strong style={{ color: '#38bdf8' }}>Action:</strong> {ins.recommendation}</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                No insights generated yet. Log trades to activate automated pattern detection.
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
