import React, { useState } from 'react';
import { 
  Wallet, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldCheck, 
  Edit3, 
  Check, 
  X 
} from 'lucide-react';
import { updateAuthProfile } from '../services/api';

export default function CapitalOverviewBar({
  stats,
  trades = [],
  currentUser,
  currencyMode = 'INR',
  onUpdateUser,
}) {
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capInput, setCapInput] = useState('');
  const [isSavingCap, setIsSavingCap] = useState(false);

  // 1. Starting Capital Configuration Check
  const rawCap = currentUser?.startingCapital;
  const isCapSet = rawCap !== undefined && rawCap !== null && Number(rawCap) > 0;
  const startingCapital = isCapSet ? Number(rawCap) : 0;

  // 2. Today's Net P&L Calculation
  // Timezone-safe local today format YYYY-MM-DD
  const todayLocalStr = new Date().toLocaleDateString('en-CA');
  const todayIsoStr = new Date().toISOString().split('T')[0];

  const todayTrades = (trades || []).filter(t => {
    if (!t.entryTime && !t.exitTime) return false;
    const entryLocal = t.entryTime ? new Date(t.entryTime).toLocaleDateString('en-CA') : '';
    const entryIso = t.entryTime ? new Date(t.entryTime).toISOString().split('T')[0] : '';
    const exitLocal = t.exitTime ? new Date(t.exitTime).toLocaleDateString('en-CA') : '';
    const exitIso = t.exitTime ? new Date(t.exitTime).toISOString().split('T')[0] : '';
    return (
      entryLocal === todayLocalStr || 
      entryIso === todayIsoStr || 
      exitLocal === todayLocalStr || 
      exitIso === todayIsoStr
    );
  });

  const calculatedTodayPnl = todayTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const todayNetPnl = stats?.todayNetPnl !== undefined && stats?.todayNetPnl !== 0 
    ? stats.todayNetPnl 
    : calculatedTodayPnl;
  const todayTradesCount = todayTrades.length;

  // 3. Overall Net P&L
  const overallNetPnl = stats?.netPnl !== undefined 
    ? Number(stats.netPnl) 
    : (trades || []).reduce((acc, t) => acc + (t.netPnl || 0), 0);

  // 4. Remaining Capital
  const remainingCapital = isCapSet ? (startingCapital + overallNetPnl) : null;

  // 5. Return on Capital (ROC)
  const returnOnCapitalPct = isCapSet && startingCapital > 0 
    ? ((overallNetPnl / startingCapital) * 100) 
    : null;

  // Format Helper
  const formatMoney = (val, forceInr = false) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    if (!forceInr && currencyMode === 'R') {
      const riskUnit = currentUser?.riskPerTrade || 2000;
      return `${(val / riskUnit).toFixed(2)}R`;
    }
    if (!forceInr && currencyMode === 'PCT') {
      if (!isCapSet || startingCapital <= 0) return '—';
      return `${((val / startingCapital) * 100).toFixed(1)}%`;
    }
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    return `${sign}₹${absVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const handleSaveCapital = async () => {
    const parsed = capInput.trim() === '' ? 0 : parseFloat(capInput);
    if (isNaN(parsed) || parsed < 0) return;
    setIsSavingCap(true);
    try {
      const res = await updateAuthProfile({ startingCapital: parsed });
      if (res.success && res.user) {
        localStorage.setItem('trademind_user', JSON.stringify(res.user));
        if (onUpdateUser) onUpdateUser(res.user);
        setIsEditingCap(false);
      }
    } catch (err) {
      alert('Failed to update starting capital: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingCap(false);
    }
  };

  const isTodayPositive = todayNetPnl > 0;
  const isTodayZero = Math.abs(todayNetPnl) < 0.01;
  const isOverallPositive = overallNetPnl >= 0;
  const isRocPositive = returnOnCapitalPct !== null && returnOnCapitalPct >= 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
      gap: '12px',
      width: '100%',
    }}>
      {/* 1. Starting Capital */}
      <div className="glass-panel" style={{
        padding: '16px 18px',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Starting Capital
            </span>
          </div>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa',
          }}>
            <Wallet size={14} />
          </div>
        </div>

        {isEditingCap ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
            <input
              type="number"
              value={capInput}
              onChange={(e) => setCapInput(e.target.value)}
              placeholder={isCapSet ? String(startingCapital) : '0'}
              autoFocus
              className="input-field"
              style={{
                height: '32px',
                padding: '4px 8px',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                width: '100%',
              }}
            />
            <button
              onClick={handleSaveCapital}
              disabled={isSavingCap}
              title="Save Capital"
              style={{
                background: '#10b981',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setIsEditingCap(false)}
              title="Cancel"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: isCapSet ? '#f8fafc' : '#64748b',
              letterSpacing: '-0.02em',
            }}>
              {isCapSet ? `₹${startingCapital.toLocaleString('en-IN')}` : '—'}
            </div>
            <button
              onClick={() => {
                setCapInput(isCapSet ? String(startingCapital) : '0');
                setIsEditingCap(true);
              }}
              title="Edit starting capital"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            >
              <Edit3 size={13} />
            </button>
          </div>
        )}

        <div style={{
          marginTop: '10px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.7rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Allocated Size</span>
          <span style={{ color: isCapSet ? '#38bdf8' : '#64748b', fontWeight: 600 }}>
            {isCapSet ? 'Base' : 'Not Set (—)'}
          </span>
        </div>
      </div>

      {/* 2. Today's Net P&L */}
      <div className="glass-panel" style={{
        padding: '16px 18px',
        background: isTodayZero 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%)' 
          : isTodayPositive
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.65) 100%)'
            : 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(15, 23, 42, 0.65) 100%)',
        border: `1px solid ${isTodayZero ? 'rgba(255, 255, 255, 0.08)' : isTodayPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Today's Net P&L
          </span>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: isTodayZero 
              ? 'rgba(148, 163, 184, 0.15)' 
              : isTodayPositive 
                ? 'rgba(16, 185, 129, 0.2)' 
                : 'rgba(244, 63, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isTodayZero ? '#94a3b8' : isTodayPositive ? '#10b981' : '#f43f5e',
          }}>
            <Clock size={14} />
          </div>
        </div>

        <div style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: isTodayZero ? '#94a3b8' : isTodayPositive ? '#10b981' : '#f43f5e',
          letterSpacing: '-0.02em',
        }}>
          {isTodayPositive ? `+${formatMoney(todayNetPnl)}` : formatMoney(todayNetPnl)}
        </div>

        <div style={{
          marginTop: '10px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.7rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{todayTradesCount} {todayTradesCount === 1 ? 'trade' : 'trades'} today</span>
          <span style={{
            color: isTodayZero ? '#64748b' : isTodayPositive ? '#34d399' : '#fb7185',
            fontWeight: 600
          }}>
            {isTodayZero ? 'No active fills' : isTodayPositive ? 'Profitable' : 'Drawdown'}
          </span>
        </div>
      </div>

      {/* 3. Remaining Capital */}
      <div className="glass-panel" style={{
        padding: '16px 18px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Remaining Capital
          </span>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
          }}>
            <ShieldCheck size={14} />
          </div>
        </div>

        <div style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: isCapSet ? (remainingCapital >= startingCapital ? '#ffffff' : '#fca5a5') : '#94a3b8',
          letterSpacing: '-0.02em',
        }}>
          {isCapSet 
            ? `₹${remainingCapital.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` 
            : '—'}
        </div>

        <div style={{
          marginTop: '10px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.7rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Net Portfolio Value</span>
          <span style={{
            color: overallNetPnl >= 0 ? '#34d399' : '#fb7185',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)'
          }}>
            {isCapSet || overallNetPnl !== 0 
              ? (overallNetPnl >= 0 ? `+₹${overallNetPnl.toLocaleString('en-IN')}` : `-₹${Math.abs(overallNetPnl).toLocaleString('en-IN')}`) 
              : '—'}
          </span>
        </div>
      </div>

      {/* 4. Overall Net P&L */}
      {/* <div className="glass-panel" style={{
        padding: '16px 18px',
        background: isOverallPositive 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)' 
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)',
        border: `1px solid ${isOverallPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Overall Net P&L
          </span>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: isOverallPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOverallPositive ? '#10b981' : '#f43f5e',
          }}>
            {isOverallPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </div>
        </div>

        <div style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: isOverallPositive ? '#10b981' : '#f43f5e',
          letterSpacing: '-0.02em',
        }}>
          {isOverallPositive ? `+${formatMoney(overallNetPnl)}` : formatMoney(overallNetPnl)}
        </div>

        <div style={{
          marginTop: '10px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.7rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Charges: ₹{(stats?.totalCharges || 0).toLocaleString('en-IN')}</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
            Gross: ₹{(stats?.grossPnl || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div> */}

      {/* 5. Return on Capital */}
      <div className="glass-panel" style={{
        padding: '16px 18px',
        background: isRocPositive
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)'
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)',
        border: `1px solid ${isRocPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Return on Capital
          </span>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a78bfa',
          }}>
            <Percent size={14} />
          </div>
        </div>

        <div style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: isCapSet ? (isRocPositive ? '#10b981' : '#f43f5e') : '#64748b',
          letterSpacing: '-0.02em',
        }}>
          {isCapSet && returnOnCapitalPct !== null 
            ? (returnOnCapitalPct >= 0 ? `+${returnOnCapitalPct.toFixed(2)}%` : `${returnOnCapitalPct.toFixed(2)}%`) 
            : '—'}
        </div>

        <div style={{
          marginTop: '10px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.7rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>ROC Yield</span>
          <span style={{
            padding: '1px 6px',
            borderRadius: '4px',
            fontSize: '0.675rem',
            fontWeight: 700,
            background: isCapSet ? (isRocPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)') : 'rgba(255, 255, 255, 0.05)',
            color: isCapSet ? (isRocPositive ? '#34d399' : '#fb7185') : '#64748b',
          }}>
            {isCapSet ? (returnOnCapitalPct >= 0 ? 'NET GAIN' : 'DRAWDOWN') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
