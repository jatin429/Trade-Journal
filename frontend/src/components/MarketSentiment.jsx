import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, Activity, AlertTriangle,
  BarChart2, Zap, Clock, Target, Flame, ChevronDown, Compass
} from 'lucide-react';
import { getOptionChain } from '../services/api';

const SYMBOLS = ['NIFTY', 'SENSEX', 'BANKNIFTY', 'MIDCPNIFTY', 'FINNIFTY'];

const SENTIMENT_CONFIG = {
  BULLISH: {
    label: 'BULLISH',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.3)',
    icon: TrendingUp,
    badge: 'badge-win',
    summary: 'Put writers are aggressive and adding support. Upside bias expected with strong call unwinding.',
  },
  SLIGHTLY_BULLISH: {
    label: 'SLIGHTLY BULLISH',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.3)',
    icon: TrendingUp,
    badge: 'badge-win',
    summary: 'Put OI outpaces Call OI modestly. Mild bullish undertone; watch ATM strikes for confirmation.',
  },
  NEUTRAL: {
    label: 'NEUTRAL (RANGE-BOUND)',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    icon: Activity,
    badge: 'badge-option',
    summary: 'Balanced Put vs Call positioning. Market expected to oscillate around ATM / Max Pain strikes.',
  },
  SLIGHTLY_BEARISH: {
    label: 'SLIGHTLY BEARISH',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.3)',
    icon: TrendingDown,
    badge: 'badge-loss',
    summary: 'Call additions outpace Put OI. Rallies may face stiff resistance near heavy Call strikes.',
  },
  BEARISH: {
    label: 'BEARISH',
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.15)',
    border: 'rgba(244,63,94,0.3)',
    icon: TrendingDown,
    badge: 'badge-loss',
    summary: 'Heavy Call writing overhead with low Put build-up. Sellers dominate; caution on long positions.',
  },
};

function formatOI(val) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000)   return `${(val / 100000).toFixed(1)}L`;
  if (val >= 1000)     return `${(val / 1000).toFixed(1)}K`;
  return String(val);
}

function PCRGauge({ pcr }) {
  const MIN = 0.5, MAX = 1.5;
  const clampedPcr = Math.min(Math.max(pcr, MIN), MAX);
  const pct = (clampedPcr - MIN) / (MAX - MIN);
  const angle = -120 + pct * 240;

  const getColor = (p) => {
    if (p >= 0.7) return '#10b981';
    if (p >= 0.5) return '#34d399';
    if (p >= 0.4) return '#f59e0b';
    if (p >= 0.2) return '#fb923c';
    return '#f43f5e';
  };
  const color = getColor(pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <svg viewBox="0 0 120 75" width="150" height="95">
        {/* Track arc */}
        <path
          d="M 16 70 A 44 44 0 0 1 104 70"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 16 70 A 44 44 0 0 1 104 70"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${pct * 138} 138`}
          style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease' }}
        />
        {/* Needle */}
        <g transform={`rotate(${angle}, 60, 70)`} style={{ transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <line x1="60" y1="70" x2="60" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="70" r="4.5" fill={color} />
        </g>
        {/* Boundary indicators */}
        <text x="12" y="73" fill="#f43f5e" fontSize="7" fontWeight="700">0.5</text>
        <text x="56" y="24" fill="#94a3b8" fontSize="6.5">1.0</text>
        <text x="96" y="73" fill="#10b981" fontSize="7" fontWeight="700">1.5</text>
        {/* Centered value */}
        <text x="60" y="58" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="800" fontFamily="var(--font-mono, monospace)">
          {pcr.toFixed(2)}
        </text>
        <text x="60" y="67" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="600">
          PUT / CALL
        </text>
      </svg>
    </div>
  );
}

function OIBar({ oi, maxOI, color, direction = 'right', isMaxPain = false, isATM = false }) {
  const pct = maxOI > 0 ? Math.min((oi / maxOI) * 100, 100) : 0;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexDirection: direction === 'left' ? 'row-reverse' : 'row',
      width: '100%',
    }}>
      <div style={{
        flex: 1,
        height: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: direction === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: direction === 'left' ? 'flex-end' : 'flex-start',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: isMaxPain
            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
            : isATM
            ? 'linear-gradient(90deg, #38bdf8, #60a5fa)'
            : `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: direction === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
          transition: 'width 0.6s ease',
          boxShadow: isMaxPain ? '0 0 10px rgba(245,158,11,0.5)' : isATM ? '0 0 10px rgba(56,189,248,0.5)' : 'none',
        }} />
      </div>
      <span style={{
        fontSize: '0.68rem',
        color: '#94a3b8',
        width: '42px',
        textAlign: direction === 'left' ? 'right' : 'left',
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 600,
      }}>
        {formatOI(oi)}
      </span>
    </div>
  );
}

export default function MarketSentiment() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [metricMode, setMetricMode] = useState('oi'); // 'oi' or 'volume'
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchData = useCallback(async (sym = symbol, exp = selectedExpiry) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOptionChain(sym, 24);
      if (res.success) {
        setData(res);
        if (!selectedExpiry && res.expiry) {
          setSelectedExpiry(res.expiry);
        }
        setLastRefresh(new Date());
        setCountdown(60);
      } else {
        setError(res.error || 'Failed to fetch options data');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Market data network error');
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedExpiry]);

  // Auto-refresh timer (every 60s for real-time dynamic market pulse)
  useEffect(() => {
    fetchData(symbol, selectedExpiry);

    intervalRef.current = setInterval(() => {
      fetchData(symbol, selectedExpiry);
    }, 60000);

    countdownRef.current = setInterval(() => {
      setCountdown(c => (c > 1 ? c - 1 : 60));
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [symbol, fetchData, selectedExpiry]);

  const handleSymbolChange = (sym) => {
    setSymbol(sym);
    setSelectedExpiry('');
    setData(null);
    setError(null);
    setCountdown(60);
    fetchData(sym, '');
  };

  const sentConf = data ? (SENTIMENT_CONFIG[data.sentiment] || SENTIMENT_CONFIG.NEUTRAL) : null;
  const SentIcon = sentConf ? sentConf.icon : Activity;

  const maxVal = metricMode === 'oi' 
    ? Math.max(data?.meta?.maxCallOI || 1, data?.meta?.maxPutOI || 1)
    : Math.max(data?.meta?.maxCallVol || 1, data?.meta?.maxPutVol || 1);

  const isGreen = (data?.dayChange || 0) >= 0;

  return (
    <div className="glass-panel" style={{
      padding: '0',
      overflow: 'hidden',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(9, 14, 28, 0.9) 100%)',
    }}>
      {/* 1. Header Toolbar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Title & Live Spot Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
            flexShrink: 0,
          }}>
            <Flame size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Live Market Pulse
              </h3>
              {data && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  background: isGreen ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                  color: isGreen ? '#10b981' : '#f43f5e',
                  border: `1px solid ${isGreen ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                }}>
                  {isGreen ? '▲' : '▼'} {data.spotPrice?.toLocaleString('en-IN')}
                  <span style={{ opacity: 0.85, fontSize: '0.68rem', fontWeight: 600 }}>
                    ({data.dayChangePerc >= 0 ? `+${data.dayChangePerc}` : data.dayChangePerc}%)
                  </span>
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              {symbol === 'SENSEX'
                ? 'Real-time BSE SENSEX Heatmap • Live Put-Call Ratio (PCR) • Max Pain Level'
                : 'Real-time NSE Options Heatmap • Live Put-Call Ratio (PCR) • Max Pain Level'}
            </div>
          </div>
        </div>

        {/* Index Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Symbol Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.35)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {SYMBOLS.map(sym => (
              <button
                key={sym}
                onClick={() => handleSymbolChange(sym)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  background: symbol === sym ? '#f59e0b' : 'transparent',
                  color: symbol === sym ? '#000000' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: symbol === sym ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Metric Mode Toggle (OI vs Volume) */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.35)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => setMetricMode('oi')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: metricMode === 'oi' ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: metricMode === 'oi' ? '#38bdf8' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              OI
            </button>
            <button
              onClick={() => setMetricMode('volume')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: metricMode === 'volume' ? 'rgba(56,189,248,0.2)' : 'transparent',
                color: metricMode === 'volume' ? '#38bdf8' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Vol
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => fetchData(symbol, selectedExpiry)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: '#e2e8f0',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Force refresh actual dynamic market data"
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{countdown}s</span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic Live Status Strip */}
      <div style={{
        padding: '6px 20px',
        background: 'rgba(16,185,129,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.7rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600 }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
            animation: 'pulse 1.8s infinite',
          }} />
          {symbol === 'SENSEX' ? 'LIVE BSE SENSEX • SPOT PRICE VIA YAHOO FINANCE' : 'ACTUAL DYNAMIC DATA • LIVE NSE DERIVATIVES STREAM'}
          {lastRefresh && (
            <span style={{ color: '#94a3b8', fontWeight: 400 }}>
              (Last update: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
            </span>
          )}
        </div>
        {data && (
          <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {data.expiry && (
              <span>Expiry: <strong style={{ color: '#ffffff' }}>{data.expiry}</strong></span>
            )}
            <span>Day Range: <strong style={{ color: '#f8fafc' }}>₹{data.low?.toLocaleString('en-IN')} — ₹{data.high?.toLocaleString('en-IN')}</strong></span>
            {symbol === 'SENSEX' && (
              <span style={{
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(99,102,241,0.2)',
                color: '#818cf8',
                fontWeight: 800,
                fontSize: '0.65rem',
                border: '1px solid rgba(99,102,241,0.3)',
              }}>
                BSE
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          margin: '16px 20px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(244,63,94,0.1)',
          border: '1px solid rgba(244,63,94,0.3)',
          color: '#f43f5e',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Market Feed Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !data && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b' }} />
            Streaming live option chain & PCR ratios for {symbol}...
          </div>
        </div>
      )}

      {/* 3. Main Market Dashboard Overview */}
      {data && (
        <>
          {/* Top Analytical Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '16px',
            padding: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* 1. PCR Ratio Card with Visual Arc */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Put-Call Ratio (PCR)
              </div>
              <PCRGauge pcr={data.pcr.oi} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.72rem',
              }}>
                <span style={{ color: '#64748b' }}>OI PCR: <strong style={{ color: sentConf.color }}>{data.pcr.oi.toFixed(2)}</strong></span>
                <span style={{ color: '#64748b' }}>Volume PCR: <strong style={{ color: '#38bdf8' }}>{data.pcr.volume.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* 2. Sentiment & Tactical Writing */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Market Bias & Writing
                  </span>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    background: sentConf.bg,
                    border: `1px solid ${sentConf.border}`,
                  }}>
                    <SentIcon size={13} color={sentConf.color} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: sentConf.color }}>
                      {sentConf.label}
                    </span>
                  </div>
                </div>
                <p style={{
                  fontSize: '0.8rem',
                  lineHeight: '1.45',
                  color: '#e2e8f0',
                  margin: 0,
                  background: 'rgba(0,0,0,0.2)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${sentConf.color}`,
                }}>
                  {sentConf.summary}
                </p>
              </div>

              <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#64748b' }}>
                ⚡ Strategy Tip: {data.pcr.oi < 0.8 
                  ? 'High call open interest acts as rigid ceiling. Avoid chasing breakouts until 22,800 calls unwind.'
                  : data.pcr.oi > 1.2 
                  ? 'Strong put base providing downside safety cushion. Look for buy-on-dip setups near ATM.' 
                  : 'Range-bound structure favoring non-directional options selling or mean-reversion scalp playbooks.'}
              </div>
            </div>

            {/* 3. Key Market Levels Card (Max Pain + ATM) */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Key Levels & Magnet Strikes
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                    ATM Strike:
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono, monospace)' }}>
                    {data.atmStrike?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    Max Pain Level:
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono, monospace)' }}>
                    {data.maxPain?.toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                    Distance to Max Pain:
                  </span>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: (data.maxPain - data.spotPrice) >= 0 ? '#10b981' : '#f43f5e',
                  }}>
                    {(data.maxPain - data.spotPrice) > 0 ? `+${(data.maxPain - data.spotPrice).toFixed(1)} pts` : `${(data.maxPain - data.spotPrice).toFixed(1)} pts`}
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#64748b',
              }}>
                <span>Call OI: <strong style={{ color: '#f43f5e' }}>{formatOI(data.pcr.totalCallOI)}</strong></span>
                <span>Put OI: <strong style={{ color: '#10b981' }}>{formatOI(data.pcr.totalPutOI)}</strong></span>
              </div>
            </div>
          </div>

          {/* 4. Strike-Wise Open Interest / Volume Heatmap */}
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Strike-Wise {metricMode === 'oi' ? 'Open Interest (OI)' : 'Volume'} Distribution Heatmap
                </h4>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Relative positioning across active strikes • Centered on ATM & Max Pain
                </div>
              </div>

              {/* Legend Badges */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f43f5e' }} />
                  Call {metricMode === 'oi' ? 'OI (Resistance)' : 'Vol'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
                  Put {metricMode === 'oi' ? 'OI (Support)' : 'Vol'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38bdf8' }} />
                  ATM Strike
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
                  Max Pain
                </span>
              </div>
            </div>

            {/* Heatmap Column Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 70px 1fr',
              padding: '8px 12px',
              borderRadius: '8px 8px 0 0',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              <div style={{ color: '#f43f5e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>CALL {metricMode.toUpperCase()}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>(Resistance Buildup)</span>
              </div>
              <div style={{ color: '#f8fafc', textAlign: 'center', textTransform: 'uppercase' }}>
                STRIKE
              </div>
              <div style={{ color: '#10b981', textAlign: 'right', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>(Support Buildup)</span>
                <span>PUT {metricMode.toUpperCase()}</span>
              </div>
            </div>

            {/* Heatmap Strike Rows */}
            <div style={{
              maxHeight: '360px',
              overflowY: 'auto',
              borderRadius: '0 0 8px 8px',
              border: '1px solid rgba(255,255,255,0.06)',
              borderTop: 'none',
              background: 'rgba(0,0,0,0.2)',
            }}>
              {(data.heatmap || []).map((row, idx) => {
                const callVal = metricMode === 'oi' ? row.call.oi : row.call.volume;
                const putVal = metricMode === 'oi' ? row.put.oi : row.put.volume;
                const isMaxPain = row.strike === data.maxPain;
                const isATM = row.isATM;

                return (
                  <div
                    key={row.strike}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 1fr',
                      padding: '4px 12px',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isATM
                        ? 'rgba(56, 189, 248, 0.08)'
                        : isMaxPain
                        ? 'rgba(245, 158, 11, 0.08)'
                        : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Call Bar (Left Side) */}
                    <OIBar
                      oi={callVal}
                      maxOI={maxVal}
                      color="#f43f5e"
                      direction="left"
                      isMaxPain={isMaxPain}
                      isATM={isATM}
                    />

                    {/* Central Strike Price Badge */}
                    <div style={{
                      textAlign: 'center',
                      padding: '3px 4px',
                      borderRadius: '6px',
                      background: isATM
                        ? 'rgba(56, 189, 248, 0.2)'
                        : isMaxPain
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(255,255,255,0.03)',
                      border: isATM
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : isMaxPain
                        ? '1px solid rgba(245, 158, 11, 0.45)'
                        : '1px solid transparent',
                    }}>
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: isATM || isMaxPain ? 800 : 700,
                        color: isATM ? '#38bdf8' : isMaxPain ? '#f59e0b' : '#f8fafc',
                        fontFamily: 'var(--font-mono, monospace)',
                        lineHeight: 1.1,
                      }}>
                        {row.strike.toLocaleString('en-IN')}
                      </div>
                      {isATM && (
                        <div style={{ fontSize: '0.55rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.04em' }}>
                          ATM
                        </div>
                      )}
                      {isMaxPain && !isATM && (
                        <div style={{ fontSize: '0.52rem', color: '#f59e0b', fontWeight: 800, letterSpacing: '0.04em' }}>
                          PAIN
                        </div>
                      )}
                    </div>

                    {/* Put Bar (Right Side) */}
                    <OIBar
                      oi={putVal}
                      maxOI={maxVal}
                      color="#10b981"
                      direction="right"
                      isMaxPain={isMaxPain}
                      isATM={isATM}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.9); } }
      `}</style>
    </div>
  );
}

