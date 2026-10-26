import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Layers,
  RefreshCw,
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { getMarketHeatmap } from '../services/api';

const INDEX_CONFIGS = [
  { id: 'NIFTY50', label: 'Nifty 50 Index', flag: '🇮🇳', desc: '50 Largest Indian Blue-Chips' },
  { id: 'BANKNIFTY', label: 'Nifty Bank', flag: '🏦', desc: '14 Top Indian Banking Leaders' },
  { id: 'SENSEX', label: 'BSE Sensex', flag: '🏛️', desc: '30 Benchmark BSE Companies' },
  { id: 'CNX100', label: 'Nifty 100', flag: '📈', desc: 'Top 100 Large-Cap Equities' },
  { id: 'CNX500', label: 'Nifty 500', flag: '🚀', desc: 'Broad Market (Top 500 Equities)' }
];

/**
 * Squarified Treemap Layout Algorithm
 * Divides a rectangle into near-square child tiles
 */
function computeTreemap(items, x, y, width, height) {
  if (!items || items.length === 0 || width <= 0 || height <= 0) return [];
  const total = items.reduce((acc, it) => acc + (it.value || 1), 0);
  if (total <= 0) return [];

  const results = [];
  const totalArea = width * height;

  function worst(row, w) {
    if (row.length === 0) return Infinity;
    const rTotal = row.reduce((acc, it) => acc + it.area, 0);
    const maxA = Math.max(...row.map(it => it.area));
    const minA = Math.min(...row.map(it => it.area));
    const w2 = w * w;
    const rTotal2 = rTotal * rTotal;
    return Math.max((w2 * maxA) / rTotal2, rTotal2 / (w2 * minA));
  }

  function layoutRow(row, w, rX, rY, rW, rH) {
    const rTotal = row.reduce((acc, it) => acc + it.area, 0);
    const isHoriz = rW >= rH;
    let curX = rX;
    let curY = rY;

    if (isHoriz) {
      const rowWidth = rH > 0 ? rTotal / rH : 0;
      row.forEach(it => {
        const itemHeight = rowWidth > 0 ? it.area / rowWidth : 0;
        results.push({ ...it.orig, x: curX, y: curY, w: rowWidth, h: itemHeight });
        curY += itemHeight;
      });
      return { remX: rX + rowWidth, remY: rY, remW: Math.max(0, rW - rowWidth), remH: rH };
    } else {
      const rowHeight = rW > 0 ? rTotal / rW : 0;
      row.forEach(it => {
        const itemWidth = rowHeight > 0 ? it.area / rowHeight : 0;
        results.push({ ...it.orig, x: curX, y: curY, w: itemWidth, h: rowHeight });
        curX += itemWidth;
      });
      return { remX: rX, remY: rY + rowHeight, remW: rW, remH: Math.max(0, rH - rowHeight) };
    }
  }

  function squarify(children, row, w, rX, rY, rW, rH) {
    if (children.length === 0) {
      if (row.length > 0) layoutRow(row, w, rX, rY, rW, rH);
      return;
    }
    const c = children[0];
    const newRow = [...row, c];
    if (row.length === 0 || worst(row, w) >= worst(newRow, w)) {
      squarify(children.slice(1), newRow, w, rX, rY, rW, rH);
    } else {
      const { remX, remY, remW, remH } = layoutRow(row, w, rX, rY, rW, rH);
      const newW = Math.min(remW, remH);
      squarify(children, [], newW, remX, remY, remW, remH);
    }
  }

  const scaled = items.map(it => ({
    area: (Math.max(1, it.value) / total) * totalArea,
    orig: it
  })).sort((a, b) => b.area - a.area);

  const initialW = Math.min(width, height);
  squarify(scaled, [], initialW, x, y, width, height);
  return results;
}

/**
 * Return tailored color matching TradingView 1D change scale
 */
function getChangeColor(change, theme = 'dark') {
  if (change > 3.0) return theme === 'dark' ? '#059669' : '#10b981';
  if (change > 2.0) return theme === 'dark' ? '#10b981' : '#059669';
  if (change > 1.0) return theme === 'dark' ? '#16a34a' : '#15803d';
  if (change > 0.3) return theme === 'dark' ? '#15803d' : '#166534';
  if (change >= 0.0) return theme === 'dark' ? '#14532d' : '#14532d';
  if (change > -0.3) return theme === 'dark' ? '#7f1d1d' : '#991b1b';
  if (change > -1.0) return theme === 'dark' ? '#991b1b' : '#b91c1c';
  if (change > -2.0) return theme === 'dark' ? '#dc2626' : '#dc2626';
  if (change > -3.0) return theme === 'dark' ? '#ef4444' : '#ef4444';
  return theme === 'dark' ? '#f43f5e' : '#f43f5e';
}

function formatMarketCap(cap) {
  if (!cap || isNaN(cap)) return '—';
  if (cap >= 1000000000000) return `${(cap / 1000000000000).toFixed(2)} T`;
  if (cap >= 10000000) return `${(cap / 10000000).toFixed(1)} Cr`;
  if (cap >= 100000) return `${(cap / 100000).toFixed(1)} L`;
  return `${cap.toLocaleString('en-IN')}`;
}

function formatPrice(val) {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
}

function NiftyHeatmapComponent({ defaultTheme = 'dark', defaultIndex = 'NIFTY50' }) {
  const [theme, setTheme] = useState(defaultTheme);
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const [sizeMode, setSizeMode] = useState('marketCap'); // 'marketCap' | 'equal'
  const [groupMode, setGroupMode] = useState('sector'); // 'sector' | 'none'
  const [activeSector, setActiveSector] = useState(null); // Zoom in on sector
  const [hoveredStock, setHoveredStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpandedHeight, setIsExpandedHeight] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
<<<<<<< HEAD
  const [feedNotice, setFeedNotice] = useState(null);
=======
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(60);

  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

  // Update container size on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width || containerRef.current.clientWidth || 1200;
        const h = rect.height || containerRef.current.clientHeight || 580;
        if (w > 100 && h > 100) {
          setDimensions({ width: Math.round(w), height: Math.round(h) });
        }
      }
    };

    handleResize();
    const t1 = setTimeout(handleResize, 50);
    const t2 = setTimeout(handleResize, 200);

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen, isExpandedHeight, data]);

  // Fetch Live Indian Market Constituents from Backend
  const fetchHeatmapData = async (indexKey = selectedIndex) => {
    setLoading(true);
<<<<<<< HEAD
=======
    setError(null);
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
    try {
      const res = await getMarketHeatmap(indexKey);
      if (res && res.success) {
        setData(res);
<<<<<<< HEAD
        setFeedNotice(res.notice || null);
        setError(null);
        setLastUpdated(res.updatedAt ? new Date(res.updatedAt) : new Date());
=======
        setLastUpdated(new Date());
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
        setCountdown(60);
      } else {
        setError(res?.error || 'Failed to load live index constituents');
      }
    } catch (err) {
<<<<<<< HEAD
      const errMsg = err?.response?.data?.error || err.message || 'Market data connection error';
      setError(errMsg);
=======
      setError(err?.response?.data?.error || err.message || 'Market data connection error');
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData(selectedIndex);
    const interval = setInterval(() => {
      fetchHeatmapData(selectedIndex);
    }, 60000);

    const countdownTimer = setInterval(() => {
      setCountdown(c => (c > 1 ? c - 1 : 60));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownTimer);
    };
  }, [selectedIndex]);

  // Filter stocks by search or active sector
  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return [];
    let list = data.stocks;
    if (activeSector) {
      list = list.filter(s => s.sector === activeSector);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, activeSector, searchQuery]);

  // Compute Layout (Sector grouped or Flat)
  const treemapLayout = useMemo(() => {
    const { width, height } = dimensions;
    if (!filteredStocks || filteredStocks.length === 0 || width <= 50 || height <= 50) return [];

    if (groupMode === 'none' || activeSector) {
      // Flat layout directly over the whole area
      const items = filteredStocks.map(s => ({
        id: s.symbol,
        value: sizeMode === 'marketCap' ? Math.max(1, s.marketCap) : 100,
        stock: s
      }));
      return [{
        sector: activeSector || 'All Constituents',
        rect: { x: 0, y: 0, w: width, h: height },
        children: computeTreemap(items, 4, 4, width - 8, height - 8)
      }];
    }

    // Group by Sector
    const sectorsMap = {};
    filteredStocks.forEach(s => {
      const sec = s.sector || 'Other';
      if (!sectorsMap[sec]) sectorsMap[sec] = [];
      sectorsMap[sec].push(s);
    });

    const sectorItems = Object.entries(sectorsMap).map(([sec, stocks]) => {
      const secValue = stocks.reduce((acc, s) => acc + (sizeMode === 'marketCap' ? Math.max(1, s.marketCap) : 100), 0);
      return { id: sec, value: secValue, stocks };
    });

    // Outer treemap: divide total space among sectors
    const sectorRects = computeTreemap(sectorItems, 0, 0, width, height);

    // Inner treemap: inside each sector, squarify its constituent stocks
    return sectorRects.map(secNode => {
      const headerHeight = 26;
      const innerW = Math.max(10, secNode.w - 6);
      const innerH = Math.max(10, secNode.h - headerHeight - 6);
      const innerX = secNode.x + 3;
      const innerY = secNode.y + headerHeight + 2;

      const stockItems = secNode.stocks.map(s => ({
        id: s.symbol,
        value: sizeMode === 'marketCap' ? Math.max(1, s.marketCap) : 100,
        stock: s
      }));

      const childNodes = computeTreemap(stockItems, innerX, innerY, innerW, innerH);

      return {
        sector: secNode.id,
        rect: { x: secNode.x, y: secNode.y, w: secNode.w, h: secNode.h },
        children: childNodes
      };
    });
  }, [filteredStocks, dimensions, groupMode, sizeMode, activeSector]);

  const activeIndexObj = INDEX_CONFIGS.find(idx => idx.id === selectedIndex) || INDEX_CONFIGS[0];

  const widgetHeight = isFullscreen
    ? 'calc(100vh - 110px)'
    : isExpandedHeight
    ? '780px'
    : '580px';

  return (
    <div
      className="glass-panel nifty-heatmap-card"
      style={{
        padding: '0',
        borderRadius: '16px',
        overflow: 'hidden',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        background: theme === 'dark'
          ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 28, 0.98) 100%)'
          : '#ffffff',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.5)',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? '10px' : 'auto',
        left: isFullscreen ? '10px' : 'auto',
        right: isFullscreen ? '10px' : 'auto',
        bottom: isFullscreen ? '10px' : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. Heatmap Custom Header Bar */}
      <div className="nifty-heatmap-header" style={{
        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
        borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0'
      }}>
        {/* Row 1: Title + LIVE badge */}
        <div className="heatmap-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)', flexShrink: 0
            }}>
              <Layers size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{
                  fontSize: '1rem', fontWeight: 800, margin: 0,
                  color: theme === 'dark' ? '#ffffff' : '#0f172a', letterSpacing: '-0.02em'
                }}>Stock Heatmap</h3>
                <span style={{
                  padding: '2px 7px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800,
                  background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                  LIVE NSE / BSE
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: theme === 'dark' ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                {activeSector ? (
                  <span onClick={() => setActiveSector(null)} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}>
                    ← Back • <strong>{activeSector}</strong>
                  </span>
                ) : 'Grouped by Sector • Sized by Market Cap'}
              </div>
            </div>
          </div>

          {/* Action control buttons — mini row */}
          <div className="heatmap-action-btns">
            {/* Refresh */}
            <button
              onClick={() => fetchHeatmapData(selectedIndex)}
              disabled={loading}
              className="heatmap-ctrl-btn"
              style={{ border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }}
              title="Refresh"
            >
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>{countdown}s</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              className="heatmap-ctrl-btn"
              style={{ border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={13} color="#f59e0b" /> : <Moon size={13} color="#6366f1" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {/* Expand */}
            {!isFullscreen && (
              <button
                onClick={() => setIsExpandedHeight(prev => !prev)}
                className="heatmap-ctrl-btn"
                style={{ border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }}
              >
                {isExpandedHeight ? 'Collapse' : 'Expand'}
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="heatmap-ctrl-btn"
              style={{ border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1', background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'Exit' : 'Full'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Index Selector + Search — scrollable on mobile */}
        <div className="heatmap-index-row">
          <div className="heatmap-index-scroller">
            {/* Index pills */}
            <div className="heatmap-index-pills" style={{
              background: theme === 'dark' ? 'rgba(0,0,0,0.35)' : '#e2e8f0',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #cbd5e1'
            }}>
              {INDEX_CONFIGS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSelectedIndex(opt.id); setActiveSector(null); }}
                  className={`heatmap-index-btn ${selectedIndex === opt.id ? 'hib-active' : ''}`}
                  style={{
                    background: selectedIndex === opt.id ? (theme === 'dark' ? '#10b981' : '#0f172a') : 'transparent',
                    color: selectedIndex === opt.id ? '#ffffff' : (theme === 'dark' ? '#94a3b8' : '#475569'),
                  }}
                  title={opt.desc}
                >
                  <span>{opt.flag}</span>
                  <span className="hib-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="heatmap-search" style={{
            background: theme === 'dark' ? 'rgba(0,0,0,0.25)' : '#ffffff',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'
          }}>
            <Search size={13} color={theme === 'dark' ? '#94a3b8' : '#64748b'} />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: theme === 'dark' ? '#ffffff' : '#0f172a',
                fontSize: '0.72rem', width: '70px'
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. TradingView-styled Subheader Toolbar */}
      <div className="heatmap-subheader" style={{
        background: theme === 'dark' ? '#0c101d' : '#f1f5f9',
        borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #e2e8f0',
        color: theme === 'dark' ? '#94a3b8' : '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Active Index Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
            borderRadius: '6px', fontWeight: 700,
            background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
            color: theme === 'dark' ? '#ffffff' : '#0f172a', fontSize: '0.73rem'
          }}>
            <span>{activeIndexObj.flag}</span>
            <span>{activeIndexObj.label}</span>
            <span style={{ fontSize: '0.64rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
              {data?.totalCount || 50} Stocks
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem' }}>
            <span>Size:</span>
            <select value={sizeMode} onChange={e => setSizeMode(e.target.value)} style={{
              background: theme === 'dark' ? '#1e293b' : '#ffffff',
              color: theme === 'dark' ? '#f8fafc' : '#0f172a',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', cursor: 'pointer'
            }}>
              <option value="marketCap">Market cap</option>
              <option value="equal">Equal size</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem' }}>
            <span>Grouping:</span>
            <select value={groupMode} onChange={e => { setGroupMode(e.target.value); setActiveSector(null); }} style={{
              background: theme === 'dark' ? '#1e293b' : '#ffffff',
              color: theme === 'dark' ? '#f8fafc' : '#0f172a',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', cursor: 'pointer'
            }}>
              <option value="sector">Sector</option>
              <option value="none">No grouping</option>
            </select>
          </div>
        </div>

<<<<<<< HEAD
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {feedNotice && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              fontSize: '0.69rem',
              fontWeight: 600
            }}>
              <span>⚡ {feedNotice}</span>
            </div>
          )}
          {error && data && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              fontSize: '0.69rem',
              fontWeight: 600
            }}>
              <span>⚠️ Live sync paused (429) • Showing cached view</span>
            </div>
          )}
          {lastUpdated && (
            <div style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
              Updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
        </div>
=======
        {lastUpdated && (
          <div style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
            Updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
      </div>

      {/* 3. Main Treemap Visual Canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: widgetHeight,
          minHeight: isFullscreen ? 'calc(100vh - 120px)' : isExpandedHeight ? '780px' : '580px',
          background: theme === 'dark' ? '#090d16' : '#f8fafc',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {loading && !data && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#94a3b8',
            fontSize: '0.88rem',
            background: theme === 'dark' ? 'rgba(9,13,22,0.85)' : 'rgba(255,255,255,0.85)',
            zIndex: 10
          }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
            <span>Loading live constituents for {activeIndexObj.label}...</span>
          </div>
        )}

<<<<<<< HEAD
        {error && (!data || !data.stocks || data.stocks.length === 0) && (
          <div style={{
            margin: '20px',
            padding: '16px 20px',
=======
        {error && (
          <div style={{
            margin: '20px',
            padding: '14px 18px',
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
            borderRadius: '10px',
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.3)',
            color: '#f43f5e',
<<<<<<< HEAD
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div><strong>Feed Notice:</strong> {error}</div>
            <button
              onClick={() => fetchHeatmapData(selectedIndex)}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#f43f5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              Retry
            </button>
=======
            fontSize: '0.82rem'
          }}>
            <strong>Feed Notice:</strong> {error}
>>>>>>> 4f08dd871f219d01d0e174ab054099f8e98a6da8
          </div>
        )}

        {/* Rendered Treemap Blocks */}
        {treemapLayout.map((sectorBlock) => {
          const { sector, rect, children } = sectorBlock;

          return (
            <div
              key={sector}
              style={{
                position: 'absolute',
                left: `${rect.x}px`,
                top: `${rect.y}px`,
                width: `${rect.w}px`,
                height: `${rect.h}px`,
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                background: theme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Sector Header Title (TradingView style e.g. "Finance >") */}
              {groupMode === 'sector' && !activeSector && (
                <div
                  onClick={() => setActiveSector(sector)}
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '6px',
                    height: '22px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: theme === 'dark' ? '#94a3b8' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 2,
                    userSelect: 'none'
                  }}
                  title={`Zoom into ${sector} sector`}
                >
                  <span style={{ textTransform: 'capitalize' }}>{sector}</span>
                  <ChevronRight size={12} />
                </div>
              )}

              {/* Children Stock Tiles */}
              {children.map(stockNode => {
                const s = stockNode.stock;
                const tileColor = getChangeColor(s.change, theme);
                const isGreen = s.change >= 0;
                const isHovered = hoveredStock?.symbol === s.symbol;

                // Adjust font size based on tile dimensions
                const isCompact = stockNode.w < 65 || stockNode.h < 50;
                const isTiny = stockNode.w < 45 || stockNode.h < 35;

                return (
                  <div
                    key={s.symbol}
                    onMouseEnter={() => setHoveredStock(s)}
                    onMouseLeave={() => setHoveredStock(null)}
                    style={{
                      position: 'absolute',
                      left: `${stockNode.x - rect.x}px`,
                      top: `${stockNode.y - rect.y}px`,
                      width: `${stockNode.w}px`,
                      height: `${stockNode.h}px`,
                      background: tileColor,
                      border: isHovered
                        ? '2px solid #38bdf8'
                        : theme === 'dark'
                        ? '1px solid rgba(0,0,0,0.35)'
                        : '1px solid #ffffff',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '2px',
                      overflow: 'hidden',
                      zIndex: isHovered ? 5 : 1,
                      transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.6)' : 'none',
                      transition: 'transform 0.15s ease, border 0.15s ease'
                    }}
                  >
                    {/* SVG Company Logo if tile has enough space */}
                    {!isCompact && s.logoUrl && (
                      <div
                        style={{
                          width: stockNode.h > 100 ? '30px' : '22px',
                          height: stockNode.h > 100 ? '30px' : '22px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '3px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                      >
                        <img
                          src={s.logoUrl}
                          alt={s.symbol}
                          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    {/* Stock Symbol */}
                    {!isTiny && (
                      <div
                        style={{
                          fontSize: stockNode.w > 120 ? '0.88rem' : stockNode.w > 80 ? '0.78rem' : '0.68rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          lineHeight: 1.1,
                          letterSpacing: '-0.01em',
                          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '90%'
                        }}
                      >
                        {s.symbol}
                      </div>
                    )}

                    {/* Percentage Change */}
                    <div
                      style={{
                        fontSize: stockNode.w > 120 ? '0.82rem' : stockNode.w > 80 ? '0.72rem' : '0.62rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.95)',
                        lineHeight: 1.1,
                        marginTop: '2px',
                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                        fontFamily: 'var(--font-mono, monospace)'
                      }}
                    >
                      {isGreen ? `+${s.change.toFixed(2)}%` : `${s.change.toFixed(2)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 4. Active Stock Tooltip Overlay (matching TradingView lower-right popup) */}
        {hoveredStock && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
              zIndex: 20,
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            {/* Logo */}
            {hoveredStock.logoUrl && (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                <img
                  src={hoveredStock.logoUrl}
                  alt={hoveredStock.symbol}
                  style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            {/* Symbol & Name */}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                {hoveredStock.symbol}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {hoveredStock.name} • {hoveredStock.sector}
              </div>
            </div>

            {/* Price */}
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>PRICE</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono, monospace)' }}>
                {formatPrice(hoveredStock.price)}
              </div>
            </div>

            {/* Market Cap */}
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>MARKET CAP</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono, monospace)' }}>
                {formatMarketCap(hoveredStock.marketCap)}
              </div>
            </div>

            {/* Change 1D */}
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>CHANGE 1D, %</div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: hoveredStock.change >= 0 ? '#10b981' : '#f43f5e',
                fontFamily: 'var(--font-mono, monospace)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {hoveredStock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {hoveredStock.change >= 0 ? `+${hoveredStock.change.toFixed(2)}%` : `${hoveredStock.change.toFixed(2)}%`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. TradingView-Styled Performance Legend Bar */}
      <div
        style={{
          padding: '6px 18px',
          background: theme === 'dark' ? '#0c101d' : '#f1f5f9',
          borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        {/* Scale Numbers & Gradient */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Performance Scale:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: 700 }}>-3%</span>
            <div
              style={{
                width: '180px',
                height: '8px',
                borderRadius: '4px',
                background: 'linear-gradient(90deg, #f43f5e 0%, #dc2626 25%, #334155 50%, #16a34a 75%, #10b981 100%)'
              }}
            />
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>+3%</span>
          </div>
        </div>

        {/* Live Attribution */}
        <div style={{ fontSize: '0.68rem', color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>
          Actual Live NSE & BSE Derivatives Feed • Real-Time Market Capitalization
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default memo(NiftyHeatmapComponent);
