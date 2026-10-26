import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Plus,
  Layers,
  Sparkles,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { updateTrade, setTradeCostPrice, lookupIpoSymbol } from '../services/api';
import CapitalOverviewBar from './CapitalOverviewBar';

export default function TradeLog({ 
  trades, 
  onDeleteTrade, 
  onOpenLogModal, 
  currencyMode,
  selectedFilterDate,
  onClearDateFilter,
  onRefresh,
  stats,
  currentUser,
  onUpdateUser,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [costInput, setCostInput] = useState('');
  const [isSavingCost, setIsSavingCost] = useState(false);
  const [costSuccess, setCostSuccess] = useState(false);
  const [ipoSuggestion, setIpoSuggestion] = useState(null);
  const [isCheckingIpo, setIsCheckingIpo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10 default or 15

  // Reset page when any filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, assetFilter, selectedFilterDate]);

  // Parse charges whether stored as JSON string or plain object
  const parseCharges = (charges) => {
    if (!charges) return {};
    if (typeof charges === 'string') {
      try { return JSON.parse(charges); } catch { return {}; }
    }
    return charges;
  };

  const formatVal = (num) => {
    if (num === undefined || num === null) return '₹0';
    if (currencyMode === 'R') {
      const riskUnit = 2000;
      return `${(num / riskUnit).toFixed(2)}R`;
    }
    if (currencyMode === 'PCT') {
      const cap = 200000;
      return `${((num / cap) * 100).toFixed(1)}%`;
    }
    return `₹${Number(num).toLocaleString('en-IN')}`;
  };

  const handleOpenDrawer = async (t) => {
    setSelectedTrade(t);
    setCostInput('');
    setCostSuccess(false);
    setIpoSuggestion(null);
    // Auto-lookup dynamic IPO intelligence for equity sell orders
    if (t.tradeType === 'SELL') {
      try {
        const res = await lookupIpoSymbol(t.symbol);
        if (res.success && res.match) setIpoSuggestion(res.match);
      } catch { /* silent */ }
    }
  };

  const handleCheckIpo = async (symbol) => {
    if (!symbol) return;
    setIsCheckingIpo(true);
    try {
      const res = await lookupIpoSymbol(symbol);
      if (res.success && res.match) {
        setIpoSuggestion(res.match);
      } else {
        alert(`No dynamic IPO listing detected for "${symbol}". You can manually specify your cost price below.`);
      }
    } catch (err) {
      console.error('IPO check error:', err);
    } finally {
      setIsCheckingIpo(false);
    }
  };

  const handleSaveCost = async (overridePrice) => {
    const price = overridePrice !== undefined ? overridePrice : costInput;
    if (!price || isNaN(price) || !selectedTrade) return;
    setIsSavingCost(true);
    setCostSuccess(false);
    try {
      const res = await setTradeCostPrice(selectedTrade.id, parseFloat(price));
      if (res.success && res.trade) {
        setSelectedTrade(res.trade);
        setCostSuccess(true);
        setCostInput('');
        setIpoSuggestion(null);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to update cost price:', err);
    } finally {
      setIsSavingCost(false);
    }
  };

  // Filtering
  const filteredTrades = (trades || []).filter(t => {
    // Date filter if coming from Calendar click
    if (selectedFilterDate) {
      const tradeDate = t.entryTime ? new Date(t.entryTime).toISOString().split('T')[0] : '';
      if (tradeDate !== selectedFilterDate) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

    // Asset filter
    if (assetFilter !== 'ALL' && t.assetClass !== assetFilter) return false;

    // Search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const sym = (t.symbol || '').toLowerCase();
      const strat = (t.strategyName || '').toLowerCase();
      const broker = (t.brokerSource || '').toLowerCase();
      if (!sym.includes(q) && !strat.includes(q) && !broker.includes(q)) return false;
    }

    return true;
  });

  // Pagination computations
  const totalTrades = filteredTrades.length;
  const totalPages = Math.ceil(totalTrades / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTrades);
  const paginatedTrades = filteredTrades.slice(startIndex, endIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Date Filter Alert Banner (if clicked from calendar) */}
      {selectedFilterDate && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '10px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.85rem', color: '#93c5fd' }}>
            📅 Showing trades for selected calendar date: <strong>{selectedFilterDate}</strong>
          </span>
          <button
            onClick={onClearDateFilter}
            className="btn btn-secondary btn-sm"
          >
            Show All Dates
          </button>
        </div>
      )}

      {/* 5 CAPITAL & PORTFOLIO METRICS BAR */}
      <CapitalOverviewBar
        stats={stats}
        trades={trades}
        currentUser={currentUser}
        currencyMode={currencyMode}
        onUpdateUser={onUpdateUser}
      />

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            placeholder="Search symbol, strategy, broker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>STATUS:</span>
          {['ALL', 'WIN', 'LOSS', 'OPEN'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: statusFilter === st ? '#ffffff' : '#94a3b8',
                border: statusFilter === st ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}

          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginLeft: '8px' }}>ASSET:</span>
          {['ALL', 'OPTIONS', 'EQUITY', 'FUTURES'].map(as => (
            <button
              key={as}
              onClick={() => setAssetFilter(as)}
              style={{
                background: assetFilter === as ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: assetFilter === as ? '#ffffff' : '#94a3b8',
                border: assetFilter === as ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {as}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button onClick={onOpenLogModal} className="btn btn-primary btn-sm">
          <Plus size={15} />
          <span>Add Trade</span>
        </button>
      </div>

      {/* Trades Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px' }}>Symbol</th>
                <th style={{ padding: '14px 18px' }}>Asset / Side</th>
                <th style={{ padding: '14px 18px' }}>Entry & Exit</th>
                <th style={{ padding: '14px 18px' }}>Qty / Lots</th>
                <th style={{ padding: '14px 18px' }}>Net P&L</th>
                <th style={{ padding: '14px 18px' }}>R-Multiple</th>
                <th style={{ padding: '14px 18px' }}>Setup / Strategy</th>
                <th style={{ padding: '14px 18px' }}>Broker Source</th>
                <th style={{ padding: '14px 18px' }}>Rules</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.length > 0 ? (
                paginatedTrades.map((t) => {
                  const isWin = t.status === 'WIN';
                  const isLoss = t.status === 'LOSS';
                  const entryDate = t.entryTime ? new Date(t.entryTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

                  return (
                    <tr 
                      key={t.id}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => handleOpenDrawer(t)}
                    >
                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          className={`badge ${isWin ? 'badge-win' : isLoss ? 'badge-loss' : 'badge-be'}`}
                          style={
                            t.status === 'OPEN'
                              ? { background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }
                              : t.status === 'CLOSED'
                                ? { background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' }
                                : {}
                          }
                        >
                          {isWin ? <ArrowUpRight size={12} /> : isLoss ? <ArrowDownRight size={12} /> : null}
                          {t.status}
                        </span>
                      </td>

                      {/* Symbol */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{t.symbol}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{entryDate}</div>
                      </td>

                      {/* Asset & Direction */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge ${t.assetClass === 'OPTIONS' ? 'badge-option' : 'badge-equity'}`}>
                            {t.assetClass}
                          </span>
                          <span style={{ 
                            fontSize: '0.725rem', 
                            fontWeight: 700, 
                            color: t.tradeType === 'BUY' ? '#10b981' : '#f43f5e' 
                          }}>
                            {t.tradeType}
                          </span>
                        </div>
                      </td>

                      {/* Entry & Exit Prices */}
                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)' }}>
                        {t.tradeType === 'SELL' && t.exitPrice ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div>
                              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Sold: </span>
                              <span style={{ color: '#ffffff', fontWeight: 700 }}>₹{t.exitPrice}</span>
                            </div>
                            {t.entryPrice > 0 ? (
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Buy Cost: ₹{t.entryPrice}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.68rem', color: '#eab308' }}>
                                (Cost not set)
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{ color: '#ffffff' }}>₹{t.entryPrice}</span>
                            <span style={{ color: '#64748b', margin: '0 4px' }}>→</span>
                            <span style={{ color: t.exitPrice ? '#f8fafc' : '#38bdf8' }}>
                              {t.exitPrice ? `₹${t.exitPrice}` : 'Open'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)' }}>
                        {t.quantity} {t.lotSize > 1 ? `(Lot ${t.lotSize})` : 'sh'}
                      </td>

                      {/* Net PnL */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-mono)',
                          color: isWin ? '#10b981' : isLoss ? '#f43f5e' : '#94a3b8'
                        }}>
                          {t.netPnl >= 0 ? `+${formatVal(t.netPnl)}` : formatVal(t.netPnl)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span>Charges: ₹{Number((parseCharges(t.charges)?.totalCharges || parseCharges(t.charges)?.total || 0)).toFixed(2)}</span>
                          {parseCharges(t.charges)?.brokerage !== undefined && (
                            <span style={{ color: Number(parseCharges(t.charges)?.brokerage) > 0 ? '#94a3b8' : '#10b981' }}>
                              • Brok: ₹{Number(parseCharges(t.charges)?.brokerage || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* R-Multiple */}
                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: t.rMultiple >= 2 ? 'rgba(16, 185, 129, 0.2)' : t.rMultiple > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                          color: t.rMultiple >= 2 ? '#34d399' : t.rMultiple > 0 ? '#60a5fa' : '#fb7185',
                        }}>
                          {t.rMultiple >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                        </span>
                      </td>

                      {/* Strategy */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: '#e2e8f0',
                        }}>
                          {t.strategyName || 'Discretionary'}
                        </span>
                      </td>

                      {/* Broker */}
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-broker">
                          {t.brokerSource}
                        </span>
                      </td>

                      {/* Rules Followed */}
                      <td style={{ padding: '14px 18px' }}>
                        {t.rulesFollowed ? (
                          <CheckCircle2 size={18} color="#10b981" title="Rules followed strictly" />
                        ) : (
                          <XCircle size={18} color="#f43f5e" title="Rule violated" />
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenDrawer(t)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Inspect details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteTrade && onDeleteTrade(t.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f43f5e',
                              cursor: 'pointer',
                              padding: '4px',
                              opacity: 0.7,
                            }}
                            title="Delete trade"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No trades match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Bar */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.015)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem',
        }}>
          {/* Left: Summary text */}
          <div style={{ color: '#94a3b8' }}>
            Showing{' '}
            <strong style={{ color: '#ffffff' }}>
              {totalTrades === 0 ? 0 : startIndex + 1}
            </strong>
            {' – '}
            <strong style={{ color: '#ffffff' }}>{endIndex}</strong> of{' '}
            <strong style={{ color: '#ffffff' }}>{totalTrades}</strong> trades
          </div>

          {/* Right: Page size and controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Rows Per Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{
                  height: '30px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  width: 'auto',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#ffffff'
                }}
              >
                <option value={10}>10 rows</option>
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>

            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage <= 1}
                title="First page"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: safePage <= 1 ? '#475569' : '#cbd5e1',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                  padding: '5px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
                title="Previous page"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: safePage <= 1 ? '#475569' : '#cbd5e1',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                  padding: '5px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <span style={{
                padding: '0 8px',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
              }}>
                Page <strong style={{ color: '#10b981' }}>{safePage}</strong> of{' '}
                <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safePage >= totalPages}
                title="Next page"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: safePage >= totalPages ? '#475569' : '#cbd5e1',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                  padding: '5px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage >= totalPages}
                title="Last page"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: safePage >= totalPages ? '#475569' : '#cbd5e1',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                  padding: '5px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Detail Drawer / Modal */}
      {selectedTrade && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'flex-end',
        }} onClick={() => setSelectedTrade(null)}>
          <div 
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0d121d',
              borderLeft: '1px solid var(--border-subtle)',
              height: '100%',
              overflowY: 'auto',
              padding: 'clamp(16px, 4vw, 28px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={`badge ${selectedTrade.status === 'WIN' ? 'badge-win' : 'badge-loss'}`}>
                  {selectedTrade.status}
                </span>
                <h2 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800, marginTop: '6px' }}>
                  {selectedTrade.symbol}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                  Logged via {selectedTrade.brokerSource}
                </div>
              </div>
              <button 
                onClick={() => setSelectedTrade(null)} 
                className="btn btn-secondary btn-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* P&L Hero in Drawer */}
            <div style={{
              background: selectedTrade.netPnl >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${selectedTrade.netPnl >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              borderRadius: '12px',
              padding: '18px',
            }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Net Realized P&L</div>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: selectedTrade.netPnl >= 0 ? '#10b981' : '#f43f5e',
                fontFamily: 'var(--font-mono)'
              }}>
                {selectedTrade.netPnl >= 0 ? `+₹${selectedTrade.netPnl.toLocaleString('en-IN')}` : `₹${selectedTrade.netPnl.toLocaleString('en-IN')}`}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>Gross: ₹{selectedTrade.grossPnl}</span>
                <span>Realized: {selectedTrade.rMultiple}R</span>
                <span>Return: {selectedTrade.pnlPercentage}%</span>
              </div>
            </div>

            {/* Cost Price Setup Card for Sold Equities */}
            {selectedTrade.tradeType === 'SELL' && (
              <div className="glass-panel" style={{ 
                padding: '16px', 
                border: selectedTrade.entryPrice > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.4)', 
                background: selectedTrade.entryPrice > 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.08)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: selectedTrade.entryPrice > 0 ? '#34d399' : '#fbbf24' }}>
                      {selectedTrade.entryPrice > 0 ? '✅ Purchase / IPO Cost Price' : '⚠️ Set Purchase / IPO Cost Price'}
                    </div>
                    {!ipoSuggestion && (
                      <button
                        onClick={() => handleCheckIpo(selectedTrade.symbol)}
                        disabled={isCheckingIpo}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          borderRadius: '6px',
                          color: '#a5b4fc',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          cursor: 'pointer',
                        }}
                        title="Dynamically search NSE India & live databases for this IPO"
                      >
                        {isCheckingIpo ? 'Checking...' : '🔍 Dynamic IPO Check'}
                      </button>
                    )}
                  </div>
                  {costSuccess && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>✓ P&L Recalculated!</span>}
                </div>
                
                {/* Dynamic IPO Auto-Suggestion Banner */}
                {ipoSuggestion && !costSuccess && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(139, 92, 246, 0.08))',
                    border: '1px solid rgba(99, 102, 241, 0.38)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(99, 102, 241, 0.3)',
                          color: '#c7d2fe',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                        }}>
                          ⚡ Dynamic IPO Intelligence
                        </span>
                        {ipoSuggestion.source && (
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            • {ipoSuggestion.source}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSaveCost(ipoSuggestion.issuePrice)}
                        disabled={isSavingCost}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                        }}
                      >
                        {isSavingCost ? 'Applying...' : `1-Click Apply ₹${ipoSuggestion.issuePrice}`}
                      </button>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
                      {ipoSuggestion.name}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.73rem', color: '#94a3b8' }}>
                      <span>Issue / Allotment Price: <strong style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>₹{ipoSuggestion.issuePrice}</strong></span>
                      {ipoSuggestion.ipoLotSize > 1 && (
                        <span>Lot Size: <strong style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>{ipoSuggestion.ipoLotSize} shares</strong></span>
                      )}
                      {ipoSuggestion.listingDate && (
                        <span>Listed: <strong style={{ color: '#e2e8f0' }}>{ipoSuggestion.listingDate}</strong></span>
                      )}
                    </div>
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                  Sold at <strong>₹{selectedTrade.exitPrice || selectedTrade.entryPrice}</strong>.&nbsp;
                  {selectedTrade.entryPrice > 0 
                    ? `Current cost price is ₹${selectedTrade.entryPrice}. Adjust below to recalculate P&L.`
                    : 'Enter the price you bought/allotted at to unlock true P&L, charges & return %.'}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '10px', top: '7px', color: '#64748b', fontSize: '0.8rem' }}>₹</span>
                    <input 
                      type="number"
                      step="any"
                      placeholder={selectedTrade.entryPrice > 0 ? String(selectedTrade.entryPrice) : 'Enter cost price...'}
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCost()}
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '24px', paddingRight: '8px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <button
                    onClick={() => handleSaveCost()}
                    disabled={isSavingCost || !costInput}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  >
                    {isSavingCost ? 'Saving...' : 'Save & Calc P&L'}
                  </button>
                </div>
              </div>
            )}

            {/* Execution Details */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '12px' }}>Execution Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                {selectedTrade.tradeType === 'SELL' ? (
                  <>
                    <div><span style={{ color: '#64748b' }}>Sold Price:</span> <strong style={{ color: '#ffffff' }}>₹{selectedTrade.exitPrice || selectedTrade.entryPrice}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Buy / Cost Price:</span> <strong style={{ color: selectedTrade.entryPrice > 0 ? '#ffffff' : '#f59e0b' }}>{selectedTrade.entryPrice > 0 ? `₹${selectedTrade.entryPrice}` : 'Not set'}</strong></div>
                  </>
                ) : (
                  <>
                    <div><span style={{ color: '#64748b' }}>Entry:</span> ₹{selectedTrade.entryPrice}</div>
                    <div><span style={{ color: '#64748b' }}>Exit:</span> ₹{selectedTrade.exitPrice || '—'}</div>
                  </>
                )}
                <div><span style={{ color: '#64748b' }}>Quantity:</span> <strong style={{ color: '#ffffff' }}>{selectedTrade.quantity} {selectedTrade.lotSize > 1 ? `(Lot ${selectedTrade.lotSize})` : 'sh'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Direction / Side:</span> <span style={{ color: selectedTrade.tradeType === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 700 }}>{selectedTrade.tradeType}</span></div>
                <div><span style={{ color: '#64748b' }}>Stop Loss:</span> ₹{selectedTrade.stopLoss || '—'}</div>
                <div><span style={{ color: '#64748b' }}>Target:</span> ₹{selectedTrade.target || '—'}</div>
              </div>
            </div>

            {/* Indian Charges Breakdown */}
            {(() => {
              const ch = parseCharges(selectedTrade.charges);
              const isFromDhan = selectedTrade.brokerSource === 'DHAN' || ch.fromDhan === true;
              const isDelivery = ch.isDelivery === true || ch.dpCharge > 0;
              const chargeLines = [
                ['STT', ch.stt],
                ['Exchange Turnover', ch.exchangeCharges],
                ['Stamp Duty', ch.stampDuty],
                ['SEBI Charges', ch.sebiCharges],
                ['Brokerage', ch.brokerage],
                ...(ch.dpCharge > 0 ? [['DP Charge (Depository)', ch.dpCharge]] : []),
                ['GST (18%)', ch.gst],
              ];
              const statutoryOnly = ch.statutoryCharges !== undefined 
                ? ch.statutoryCharges 
                : Number(((ch.totalCharges || ch.total || 0) - (ch.brokerage || 0)).toFixed(2));
              
              return (
                <div className="glass-panel" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#ffffff' }}>Taxes & Charges Breakup</h4>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isFromDhan && (
                        <span style={{
                          fontSize: '0.65rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60a5fa',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontWeight: 700,
                        }}>
                          ✓ DhanHQ Direct
                        </span>
                      )}
                      {isDelivery && (
                        <span style={{
                          fontSize: '0.65rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#34d399',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontWeight: 700,
                        }}>
                          Delivery
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.775rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>Brokerage:</span>
                      <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>₹{Number(ch.brokerage || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>Charges:</span>
                      <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>₹{Number(statutoryOnly || 0).toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', marginTop: '2px', paddingLeft: '4px', paddingRight: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#f59e0b' }}>Total Deductions:</span>
                      <span style={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>₹{Number(ch.totalCharges || ch.total || 0).toFixed(2)}</span>
                    </div>

                    <p style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      lineHeight: 1.5,
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '8px',
                      marginTop: '4px',
                      fontStyle: 'normal'
                    }}>
                      Charges includes GST, Securities Transaction Tax, SEBI Fees, Exchange Transaction Charges, Stamp Duty and other charges as mandated by government, statutory and regulatory bodies. For a detailed breakup, please refer to the contract notes sent to you on the days you trade.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Psychology & Notes */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '8px' }}>Psychology & Execution Notes</h4>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {(selectedTrade.emotions || []).map((emo, idx) => (
                  <span key={idx} className="badge badge-ai">
                    {emo}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                {selectedTrade.notes || 'No execution notes recorded for this trade.'}
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
