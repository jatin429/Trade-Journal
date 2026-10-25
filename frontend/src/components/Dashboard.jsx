import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldAlert, 
  Award, 
  Calendar as CalIcon,
  Zap,
  Target,
  FileText,
  DollarSign,
  Info,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Shield,
  Activity
} from 'lucide-react';
import { getAiProgressAudit } from '../services/api';
import CapitalOverviewBar from './CapitalOverviewBar';
import MarketSentiment from './MarketSentiment';
import NiftyHeatmap from './NiftyHeatmap';

export default function Dashboard({ 
  stats, 
  equityCurve, 
  calendarData, 
  breakdowns, 
  currencyMode,
  onSelectDate,
  onOpenLogModal,
  onOpenBrokerHub,
  onOpenAiModal,
  currentUser,
  trades = [],
  onUpdateUser,
}) {
  const [progressData, setProgressData] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [marketViewTab, setMarketViewTab] = useState('options'); // 'heatmap' | 'options' | 'both'

  useEffect(() => {
    let isMounted = true;
    getAiProgressAudit()
      .then(res => {
        if (isMounted && res.success) {
          setProgressData(res.progress);
        }
      })
      .catch(err => console.error('Failed to load progress audit:', err))
      .finally(() => {
        if (isMounted) setProgressLoading(false);
      });
    return () => { isMounted = false; };
  }, [stats]);

  const formatVal = (num) => {
    if (num === undefined || num === null) return '₹0';
    if (currencyMode === 'R') {
      const riskUnit = 2000; // standard 1R approx
      return `${(num / riskUnit).toFixed(2)}R`;
    }
    if (currencyMode === 'PCT') {
      const cap = Number(currentUser?.startingCapital);
      if (!cap || cap <= 0) return '—';
      return `${((num / cap) * 100).toFixed(1)}%`;
    }
    return `₹${Number(num).toLocaleString('en-IN')}`;
  };

  const netPnl = stats?.netPnl || 0;
  const isNetGreen = netPnl >= 0;

  // Render Calendar Heatmap for the current month
  const renderCalendar = () => {
    // Generate dates for last 28 days or current month
    const calMap = {};
    (calendarData || []).forEach(item => {
      calMap[item.date] = item;
    });

    const days = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const str = d.toISOString().split('T')[0];
      days.push({
        dateStr: str,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        data: calMap[str],
      });
    }

    return (
      <div className="calendar-heatmap-container">
        <div className="calendar-grid">
          {days.map((cell, idx) => {
            const item = cell.data;
            const hasTrades = item && item.tradesCount > 0;
            const isProfit = hasTrades && item.netPnl > 0;
            const isLoss = hasTrades && item.netPnl < 0;

            return (
              <div
                key={idx}
                onClick={() => hasTrades && onSelectDate && onSelectDate(cell.dateStr)}
                className={`cal-cell ${isProfit ? 'cal-profit' : isLoss ? 'cal-loss' : 'cal-empty'}`}
                title={hasTrades ? `${cell.dateStr}: ₹${item.netPnl.toLocaleString('en-IN')} (${item.tradesCount} trades)` : cell.dateStr}
              >
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{cell.dayNum}</span>
                {hasTrades ? (
                  <div style={{ textAlign: 'center', marginTop: '2px' }}>
                    <div style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      fontFamily: 'var(--font-mono)',
                      color: isProfit ? '#10b981' : '#f43f5e'
                    }}>
                      {item.netPnl > 0 ? `+${formatVal(item.netPnl)}` : formatVal(item.netPnl)}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', opacity: 0.8 }}>
                      {item.winCount}W-{item.lossCount}L
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.1)' }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* 0. CAPITAL & PORTFOLIO METRICS BAR */}
      <CapitalOverviewBar
        stats={stats}
        trades={trades}
        currentUser={currentUser}
        currencyMode={currencyMode}
        onUpdateUser={onUpdateUser}
      />

      {/* 1. TOP METRICS HERO CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: '14px',
      }}>
        {/* Net P&L Card */}
        <div className="glass-panel" style={{
          padding: '20px',
          background: isNetGreen 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%)' 
            : 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%)',
          borderColor: isNetGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Net Realized P&L
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isNetGreen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isNetGreen ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="#f43f5e" />}
            </div>
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: isNetGreen ? '#10b981' : '#f43f5e',
            letterSpacing: '-0.02em',
          }}>
            {netPnl >= 0 ? `+${formatVal(netPnl)}` : formatVal(netPnl)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span>Gross: ₹{(stats?.grossPnl || 0).toLocaleString('en-IN')}</span>
            <span style={{ color: '#f59e0b' }}>Taxes & Charges: ₹{(stats?.totalCharges || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Win Rate Accuracy
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Percent size={16} color="#3b82f6" />
            </div>
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}>
            {stats?.winRate || 0}%
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{stats?.winners || 0} Wins</span>
            <span style={{ color: '#f43f5e', fontWeight: 600 }}>{stats?.losers || 0} Losses</span>
            <span>{stats?.totalTrades || 0} Total</span>
          </div>
        </div>

        {/* Profit Factor Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Profit Factor
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Award size={16} color="#8b5cf6" />
            </div>
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: (stats?.profitFactor || 0) >= 1.5 ? '#10b981' : '#f59e0b',
            letterSpacing: '-0.02em',
          }}>
            {stats?.profitFactor || 0}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span>Target: &gt; 1.50</span>
            <span style={{ color: '#8b5cf6' }}>Avg R: {(stats?.avgRMultiple || 0)}R</span>
          </div>
        </div>

        {/* Average Win vs Loss & Expectancy */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Avg Win / Loss
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Target size={16} color="#06b6d4" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              +{formatVal(stats?.avgWin)}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>/</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
              -{formatVal(stats?.avgLoss)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span>Expectancy: +{formatVal(stats?.expectancy)}/trade</span>
            <span style={{ color: '#fb7185' }}>Max DD: -{formatVal(stats?.maxDrawdown)}</span>
          </div>
        </div>
      </div>

      {/* 1.5 LIVE NIFTY 50 STOCK HEATMAP & MARKET PULSE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Market Visualizer Selector Bar */}
        <div className="market-view-toolbar">
          <div className="market-view-label-row">
            <span className="market-view-label">MARKET VIEW</span>
            <div className="market-view-btn-group">
              <button
                id="btn-market-tab-heatmap"
                onClick={() => setMarketViewTab('heatmap')}
                className={`market-view-btn ${marketViewTab === 'heatmap' ? 'mvb-heatmap active' : ''}`}
              >
                <span>🗺️</span>
                <span className="mvb-full-label">Stock Heatmap</span>
                <span className="mvb-short-label">Heatmap</span>
              </button>
              <button
                id="btn-market-tab-options"
                onClick={() => setMarketViewTab('options')}
                className={`market-view-btn ${marketViewTab === 'options' ? 'mvb-options active' : ''}`}
              >
                <span>⚡</span>
                <span className="mvb-full-label">Options Pulse & PCR</span>
                <span className="mvb-short-label">Options</span>
              </button>
              <button
                id="btn-market-tab-both"
                onClick={() => setMarketViewTab('both')}
                className={`market-view-btn ${marketViewTab === 'both' ? 'mvb-both active' : ''}`}
              >
                <span>🔲</span>
                <span className="mvb-full-label">Split View (Both)</span>
                <span className="mvb-short-label">Both</span>
              </button>
            </div>
          </div>
          <div className="market-view-subtitle">
            Live Nifty 50 market capitalization & sector rotation
          </div>
        </div>

        {/* View Content */}
        {(marketViewTab === 'heatmap' || marketViewTab === 'both') && (
          <NiftyHeatmap defaultTheme="dark" defaultIndex="NIFTY50" />
        )}

        {(marketViewTab === 'options' || marketViewTab === 'both') && (
          <MarketSentiment />
        )}
      </div>

      {/* 2. TRADEMIND AI BEHAVIORAL PROGRESS & LEAKS COACH */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(15, 23, 42, 0.85) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header Bar */}
        <div className="ai-coach-header">
          <div className="ai-coach-title-group">
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
              flexShrink: 0
            }}>
              <Brain size={22} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ai-coach-badge-row">
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>
                  TradeMind AI — Progress & Behavioral Coach
                </h2>
                <span className="badge" style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  fontSize: '0.7rem',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}>
                  <span className="pulse-dot" style={{ background: '#a855f7' }} />
                  Auditing All Trades & Mindset
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Continuously analyzing your executions, emotional leaks, and discipline to help you progress toward consistency.
              </p>
            </div>
          </div>

          {/* Quick AI Action Buttons */}
          <div className="ai-coach-quick-btns">
            <button
              onClick={() => onOpenAiModal && onOpenAiModal('Where am I lacking by considering all trades and my behavior? How can I progress?', 'chat')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '8px 14px',
                background: 'rgba(139, 92, 246, 0.2)',
                borderColor: 'rgba(139, 92, 246, 0.4)',
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} color="#a855f7" />
              <span>Where Am I Lacking?</span>
            </button>
            <button
              onClick={() => onOpenAiModal && onOpenAiModal(null, 'simulate')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sliders size={14} color="#38bdf8" />
              <span>Rule Simulator</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {progressData?.hasData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
            
            {/* 1. Mindset & Discipline Score */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Discipline & Mindset Score
                  </span>
                  <Shield size={16} color={progressData.disciplineScore >= 75 ? '#10b981' : '#f59e0b'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: progressData.disciplineScore >= 75 ? '#10b981' : progressData.disciplineScore >= 50 ? '#f59e0b' : '#f43f5e'
                  }}>
                    {progressData.disciplineScore}%
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Rule Adherence Rate
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Revenge / Tilt Trades:</span>
                  <span style={{ color: progressData.behavior?.revengeTrades?.count > 0 ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
                    {progressData.behavior?.revengeTrades?.count || 0} executions ({formatVal(progressData.behavior?.revengeTrades?.associatedLoss)})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Cost of Broken Rules:</span>
                  <span style={{ color: progressData.behavior?.brokenRules?.count > 0 ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
                    -{formatVal(Math.abs(progressData.behavior?.brokenRules?.netPnl || 0))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Win Rate In-Plan vs Out:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {progressData.behavior?.followedRules?.winRate}% vs {progressData.behavior?.brokenRules?.winRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Where You Are Lacking (Active Leaks) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#f43f5e" />
                  Where You Are Lacking (Capital Leaks)
                </span>
                <span className="badge badge-loss" style={{ fontSize: '0.65rem' }}>
                  {progressData.leaks?.length || 0} Leaks Found
                </span>
              </div>

              {progressData.leaks && progressData.leaks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {progressData.leaks.slice(0, 2).map((leak, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(244, 63, 94, 0.06)',
                      border: '1px solid rgba(244, 63, 94, 0.18)',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#fda4af', marginBottom: '2px' }}>
                        {leak.title}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '4px' }}>
                        {leak.detail}
                      </div>
                      <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 600 }}>
                        ➔ Fix: {leak.action}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#10b981', fontSize: '0.8rem', padding: '12px 0' }}>
                  ✔ No critical leaks detected! You are strictly executing within your defined risk parameters.
                </div>
              )}
            </div>

            {/* 3. 3-Step Growth Roadmap */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  Actionable Steps to Progress
                </span>
                <span className="badge badge-win" style={{ fontSize: '0.65rem' }}>
                  Growth Blueprint
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                {(progressData.growthRoadmap || []).map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#cbd5e1' }}>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '1px'
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.725rem', lineHeight: '1.4' }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Empty Dataset Welcoming State */
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Brain size={24} color="#a855f7" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                Ready to Diagnose Your Edge & Psychological Leaks
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '650px', margin: '4px auto 0 auto' }}>
                TradeMind AI does not give generic chatbot responses. As soon as you log trades or sync DhanHQ / Angel One, it will automatically audit your win rate, emotional discipline, revenge trading clusters, and setup expectancy.
              </p>
            </div>
            <div className="ai-coach-welcome-actions">
              <button
                onClick={onOpenLogModal}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>+ Log First Trade</span>
              </button>
              <button
                onClick={onOpenBrokerHub}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>⚡ Connect Dhan / Angel One</span>
              </button>
              <button
                onClick={() => onOpenAiModal && onOpenAiModal('What are the most common reasons retail traders fail in F&O and how does TradeMind prevent them?', 'chat')}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>🧠 Ask TradeMind AI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MASTER EQUITY GROWTH CURVE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
              Cumulative Net Equity Growth Curve
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Realized P&L trajectory net of STT, brokerage, and exchange fees
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-win">
              <span className="pulse-dot" style={{ background: '#10b981' }} />
              Profitable System
            </span>
            <span className="badge badge-broker">
              Dhan & Angel One Synced
            </span>
          </div>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          {equityCurve && equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                            Trade #{d.tradeIndex}: {d.symbol}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {d.date}
                          </div>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 700, 
                            color: d.netPnl >= 0 ? '#10b981' : '#f43f5e',
                            marginTop: '6px',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            Trade P&L: {d.netPnl >= 0 ? `+₹${d.netPnl.toLocaleString('en-IN')}` : `₹${d.netPnl.toLocaleString('en-IN')}`}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            Cumulative: ₹{d.cumulativePnl.toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativePnl" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#pnlGlow)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              No trades logged yet. Start by logging or syncing your trades!
            </div>
          )}
        </div>
      </div>

      {/* 3. CALENDAR HEATMAP & STRATEGY BREAKDOWN */}
      <div className="dashboard-dual-grid">
        {/* Calendar Heatmap (Signature TradeZella Feature) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalIcon size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>
                P&L Heatmap Calendar
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last 4 Weeks</span>
          </div>

          {/* Days Grid */}
          {renderCalendar()}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px', fontSize: '0.725rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'rgba(16, 185, 129, 0.4)', borderRadius: '3px' }} />
              <span>Green (Profitable Day)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'rgba(244, 63, 94, 0.4)', borderRadius: '3px' }} />
              <span>Red (Loss Day)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px' }} />
              <span>No Trades</span>
            </div>
          </div>
        </div>

        {/* Indian Market Charges & Taxes Breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>
                Indian Brokerage & Taxes Breakdown
              </h3>
            </div>
            <span className="badge badge-option">
              Total: ₹{(stats?.totalCharges || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
            Full statutory fee breakdown across NSE/BSE F&O and Equity executions:
          </p>

          <div className="charges-grid">
            {[
              { label: 'Securities Transaction Tax (STT)', val: stats?.chargesBreakdown?.stt || 0, desc: 'Options: 0.1% on sell turnover' },
              { label: 'Exchange Turnover Charges', val: stats?.chargesBreakdown?.exchangeCharges || 0, desc: 'NSE/BSE turnover tariff' },
              { label: 'Brokerage (Dhan / Angel One)', val: stats?.chargesBreakdown?.brokerage || 0, desc: '₹20/order execution rate' },
              { label: 'GST (18%)', val: stats?.chargesBreakdown?.gst || 0, desc: 'On brokerage & exchange fees' },
              { label: 'Stamp Duty', val: stats?.chargesBreakdown?.stampDuty || 0, desc: 'State stamp duty on buy orders' },
              { label: 'Net Impact on P&L', val: `${(((stats?.totalCharges || 0) / ((stats?.grossPnl || 1) + 1)) * 100).toFixed(1)}%`, desc: 'Charges friction on gross gains' },
            ].map((fee, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{fee.label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {typeof fee.val === 'number' ? `₹${fee.val.toLocaleString('en-IN')}` : fee.val}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>{fee.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. STRATEGY EDGE & PLAYBOOK PERFORMANCE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
          Strategy & Setup Edge (Playbooks)
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '18px' }}>
          Compare which trade setups produce positive expectancy vs negative leaks
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '16px',
        }}>
          {(breakdowns?.byStrategy || []).map((strat, i) => {
            const isProfit = strat.pnl >= 0;
            const winRate = strat.count > 0 ? ((strat.wins / strat.count) * 100).toFixed(0) : 0;
            return (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                    {strat.name}
                  </span>
                  <span className={`badge ${isProfit ? 'badge-win' : 'badge-loss'}`}>
                    {winRate}% Win
                  </span>
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: isProfit ? '#10b981' : '#f43f5e',
                  marginTop: '8px',
                }}>
                  {isProfit ? `+₹${strat.pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(strat.pnl).toLocaleString('en-IN')}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  {strat.count} executed trades • {strat.wins} winners
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
