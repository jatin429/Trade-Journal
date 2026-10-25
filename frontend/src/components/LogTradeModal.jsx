import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, ArrowRight } from 'lucide-react';

export default function LogTradeModal({ isOpen, onClose, onSave, playbooks }) {
  if (!isOpen) return null;

  const [symbol, setSymbol] = useState('NIFTY 24600 CE');
  const [assetClass, setAssetClass] = useState('OPTIONS');
  const [tradeType, setTradeType] = useState('BUY');
  const [quantity, setQuantity] = useState(50);
  const [lotSize, setLotSize] = useState(25);
  const [entryPrice, setEntryPrice] = useState(110);
  const [exitPrice, setExitPrice] = useState(165);
  const [stopLoss, setStopLoss] = useState(90);
  const [target, setTarget] = useState(170);
  const [brokerSource, setBrokerSource] = useState('DHAN');
  const [strategyName, setStrategyName] = useState('Opening Range Breakout (ORB)');
  const [rulesFollowed, setRulesFollowed] = useState(true);
  const [emotions, setEmotions] = useState(['Disciplined']);
  const [notes, setNotes] = useState('');

  // Auto-set default lot sizes based on symbol
  useEffect(() => {
    const sym = symbol.toUpperCase();
    if (sym.includes('BANKNIFTY')) {
      setLotSize(15);
      setAssetClass('OPTIONS');
    } else if (sym.includes('NIFTY')) {
      setLotSize(25);
      setAssetClass('OPTIONS');
    } else if (assetClass === 'EQUITY') {
      setLotSize(1);
    }
  }, [symbol, assetClass]);

  // Real-time quick preview calculation
  const totalQty = quantity * (lotSize || 1);
  const grossPnl = tradeType === 'BUY'
    ? (exitPrice - entryPrice) * totalQty
    : (entryPrice - exitPrice) * totalQty;

  // Approximate Indian charges
  const turnover = (entryPrice + exitPrice) * totalQty;
  const stt = assetClass === 'OPTIONS' ? (exitPrice * totalQty * 0.001) : (exitPrice * totalQty * 0.00025);
  const brokerage = 40; // ₹20 entry + ₹20 exit
  const approxCharges = Number((stt + brokerage + 15).toFixed(2));
  const netPnl = Number((grossPnl - approxCharges).toFixed(2));

  const emotionList = ['Disciplined', 'Confident', 'Patient', 'FOMO', 'Revenge', 'Anxious', 'Greed'];

  const toggleEmotion = (e) => {
    if (emotions.includes(e)) {
      setEmotions(emotions.filter(x => x !== e));
    } else {
      setEmotions([...emotions, e]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      symbol: symbol.toUpperCase(),
      assetClass,
      tradeType,
      quantity: parseFloat(quantity),
      lotSize: parseInt(lotSize, 10),
      entryPrice: parseFloat(entryPrice),
      exitPrice: exitPrice ? parseFloat(exitPrice) : null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      target: target ? parseFloat(target) : null,
      brokerSource,
      strategyName,
      rulesFollowed,
      emotions,
      notes,
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
    }} onClick={onClose}>
      
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#0d121d',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: 'clamp(16px, 4vw, 28px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>Log New Trade</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auto-calculates Indian STT, GST, and broker deductions</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Symbol & Asset Class */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Symbol / Instrument
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. NIFTY 24600 CE"
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Asset Class
              </label>
              <select 
                value={assetClass} 
                onChange={(e) => setAssetClass(e.target.value)}
                className="input-field"
              >
                <option value="OPTIONS">Options</option>
                <option value="EQUITY">Equity</option>
                <option value="FUTURES">Futures</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Trade Direction
              </label>
              <select 
                value={tradeType} 
                onChange={(e) => setTradeType(e.target.value)}
                className="input-field"
              >
                <option value="BUY">BUY / LONG</option>
                <option value="SELL">SELL / SHORT</option>
              </select>
            </div>
          </div>

          {/* Qty, Lot Size, Entry Price, Exit Price */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Quantity
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-field font-mono"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Lot Multiplier
              </label>
              <input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Entry Price (₹)
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="input-field font-mono"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Exit Price (₹)
              </label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="input-field font-mono"
              />
            </div>
          </div>

          {/* Stop Loss & Target */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Stop Loss (₹)
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Target Price (₹)
              </label>
              <input
                type="number"
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Broker Source
              </label>
              <select 
                value={brokerSource} 
                onChange={(e) => setBrokerSource(e.target.value)}
                className="input-field"
              >
                <option value="DHAN">Dhan</option>
                <option value="ANGEL_ONE">Angel One</option>
                <option value="MANUAL">Manual Entry</option>
              </select>
            </div>
          </div>

          {/* Strategy & Rules Followed */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Playbook / Strategy Setup
              </label>
              <select
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="input-field"
              >
                {(playbooks || []).map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="Discretionary">Discretionary / Other</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Plan Adherence
              </label>
              <button
                type="button"
                onClick={() => setRulesFollowed(!rulesFollowed)}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '10px',
                  border: rulesFollowed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
                  background: rulesFollowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  color: rulesFollowed ? '#34d399' : '#fb7185',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {rulesFollowed ? '✓ Followed Rules' : '✗ Broke Rules'}
              </button>
            </div>
          </div>

          {/* Emotional State Tags */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Psychology & Emotions During Trade
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {emotionList.map(emo => {
                const active = emotions.includes(emo);
                return (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => toggleEmotion(emo)}
                    style={{
                      background: active ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: active ? '#c084fc' : '#94a3b8',
                      border: active ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {emo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Execution Notes & Thesis
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you take this trade? Any mistake or great execution..."
              className="input-field"
            />
          </div>

          {/* LIVE INDIAN CHARGES PREVIEW */}
          <div style={{
            background: netPnl >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            border: `1px solid ${netPnl >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time Estimated Net P&L:</div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: netPnl >= 0 ? '#10b981' : '#f43f5e',
                fontFamily: 'var(--font-mono)'
              }}>
                {netPnl >= 0 ? `+₹${netPnl.toLocaleString('en-IN')}` : `-₹${Math.abs(netPnl).toLocaleString('en-IN')}`}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
              <div>Gross: ₹{grossPnl.toLocaleString('en-IN')}</div>
              <div>Est. Indian Taxes & Fees: ~₹{approxCharges}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Trade to Journal
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
