import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Upload, 
  FileSpreadsheet, 
  Lock, 
  Key, 
  User, 
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Calendar
} from 'lucide-react';
import { testDhan, syncDhan, testAngelOne, syncAngelOne, uploadCsv } from '../services/api';

const getPastDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};
const getTodayStr = () => new Date().toISOString().split('T')[0];

export default function BrokerHub({ onSyncSuccess }) {
  // Dhan State
  const [dhanClientId, setDhanClientId] = useState('');
  const [dhanAccessToken, setDhanAccessToken] = useState('');
  const [dhanRangeMode, setDhanRangeMode] = useState('PRESET'); // 'PRESET' | 'CUSTOM'
  const [dhanDays, setDhanDays] = useState(90);
  const [dhanFromDate, setDhanFromDate] = useState(() => getPastDateStr(90));
  const [dhanToDate, setDhanToDate] = useState(() => getTodayStr());
  const [dhanLoading, setDhanLoading] = useState(false);
  const [dhanStatus, setDhanStatus] = useState(null);

  // Angel One State
  const [angelClientCode, setAngelClientCode] = useState('');
  const [angelApiKey, setAngelApiKey] = useState('');
  const [angelPin, setAngelPin] = useState('');
  const [angelRangeMode, setAngelRangeMode] = useState('PRESET'); // 'PRESET' | 'CUSTOM'
  const [angelDays, setAngelDays] = useState(90);
  const [angelFromDate, setAngelFromDate] = useState(() => getPastDateStr(90));
  const [angelToDate, setAngelToDate] = useState(() => getTodayStr());
  const [angelLoading, setAngelLoading] = useState(false);
  const [angelStatus, setAngelStatus] = useState(null);

  // CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvStatus, setCsvStatus] = useState(null);

  // --- Dhan Handlers ---
  const handleTestDhan = async () => {
    setDhanLoading(true);
    setDhanStatus(null);
    try {
      const res = await testDhan({ clientId: dhanClientId, accessToken: dhanAccessToken });
      setDhanStatus({ type: 'success', msg: 'DhanHQ API Connected Successfully!' });
    } catch (err) {
      setDhanStatus({ type: 'error', msg: err.response?.data?.error || err.message });
    } finally {
      setDhanLoading(false);
    }
  };

  const handleSyncDhan = async (isDemo = false) => {
    setDhanLoading(true);
    setDhanStatus(null);
    try {
      const res = await syncDhan({ 
        clientId: dhanClientId, 
        accessToken: dhanAccessToken, 
        days: dhanRangeMode === 'PRESET' ? dhanDays : undefined,
        fromDate: dhanFromDate,
        toDate: dhanToDate,
        isDemo 
      });
      const isSuccess = res.count > 0;
      setDhanStatus({ 
        type: isSuccess ? 'success' : 'info', 
        msg: res.message || (isSuccess ? 'Synced Dhan trades successfully!' : 'Connected to DhanHQ! 0 executed trades found.'),
        hint: res.hint,
        count: res.count
      });
      if (onSyncSuccess && isSuccess) onSyncSuccess();
    } catch (err) {
      setDhanStatus({ type: 'error', msg: err.response?.data?.error || err.message });
    } finally {
      setDhanLoading(false);
    }
  };

  // --- Angel One Handlers ---
  const handleTestAngel = async () => {
    setAngelLoading(true);
    setAngelStatus(null);
    try {
      const res = await testAngelOne({ clientCode: angelClientCode, apiKey: angelApiKey });
      setAngelStatus({ type: 'success', msg: 'Angel One SmartAPI Connected Successfully!' });
    } catch (err) {
      setAngelStatus({ type: 'error', msg: err.response?.data?.error || err.message });
    } finally {
      setAngelLoading(false);
    }
  };

  const handleSyncAngel = async (isDemo = false) => {
    setAngelLoading(true);
    setAngelStatus(null);
    try {
      const res = await syncAngelOne({ 
        clientCode: angelClientCode, 
        apiKey: angelApiKey, 
        days: angelRangeMode === 'PRESET' ? angelDays : undefined,
        fromDate: angelFromDate,
        toDate: angelToDate,
        isDemo 
      });
      setAngelStatus({ type: 'success', msg: res.message || 'Synced Angel One trades successfully!' });
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setAngelStatus({ type: 'error', msg: err.response?.data?.error || err.message });
    } finally {
      setAngelLoading(false);
    }
  };

  // --- CSV Handler ---
  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await uploadCsv(formData);
      setCsvStatus({ type: 'success', msg: res.message });
      setCsvFile(null);
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      setCsvStatus({ type: 'error', msg: err.response?.data?.error || err.message });
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
          }}>
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800 }}>
              Indian Broker Integration Gateway
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              Directly sync executed orders and trade books from <strong>DhanHQ</strong> & <strong>Angel One SmartAPI</strong>, or upload past contract note CSVs.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Dhan Card & Angel One Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '20px',
      }}>
        
        {/* 1. DHANHQ API CARD */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#ffffff',
                fontSize: '0.9rem'
              }}>
                D
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 700 }}>DhanHQ Direct Sync</h3>
              </div>
            </div>
            <a 
              href="https://dhanhq.co/" 
              target="_blank" 
              rel="noreferrer" 
              style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              Get Dhan API Keys <ExternalLink size={12} />
            </a>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Generate your personal <strong>Access Token</strong> inside your Dhan web profile under <em>Access Tokens & API</em>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Dhan Client ID
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="e.g. 1000123456"
                  value={dhanClientId}
                  onChange={(e) => setDhanClientId(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Dhan Access Token
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  placeholder="Paste your 24h DhanHQ Access Token"
                  value={dhanAccessToken}
                  onChange={(e) => setDhanAccessToken(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            {/* Dhan Timeframe / Custom Date Range Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  Sync History Range
                </label>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                  {dhanRangeMode === 'CUSTOM' ? 'Custom Range' : `${dhanDays} Days`}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', marginBottom: '8px' }}>
                {[
                  { label: '30D', val: 30 },
                  { label: '90D', val: 90 },
                  { label: '180D', val: 180 },
                  { label: '1Y', val: 365 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => { 
                      setDhanRangeMode('PRESET'); 
                      setDhanDays(opt.val); 
                      setDhanFromDate(getPastDateStr(opt.val)); 
                      setDhanToDate(getTodayStr()); 
                    }}
                    style={{
                      padding: '5px 2px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: (dhanRangeMode === 'PRESET' && dhanDays === opt.val) ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: (dhanRangeMode === 'PRESET' && dhanDays === opt.val) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: (dhanRangeMode === 'PRESET' && dhanDays === opt.val) ? '#34d399' : '#94a3b8',
                      transition: 'all 0.15s ease',
                      textAlign: 'center'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDhanRangeMode('CUSTOM')}
                  style={{
                    padding: '5px 2px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: dhanRangeMode === 'CUSTOM' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: dhanRangeMode === 'CUSTOM' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: dhanRangeMode === 'CUSTOM' ? '#34d399' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    textAlign: 'center'
                  }}
                >
                  Custom
                </button>
              </div>

              {/* Custom Date Range Inputs */}
              {dhanRangeMode === 'CUSTOM' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>From Date</label>
                    <input
                      type="date"
                      value={dhanFromDate}
                      max={dhanToDate || getTodayStr()}
                      onChange={(e) => setDhanFromDate(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>To Date</label>
                    <input
                      type="date"
                      value={dhanToDate}
                      min={dhanFromDate}
                      max={getTodayStr()}
                      onChange={(e) => setDhanToDate(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 8px' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: '0.725rem',
                  color: '#64748b',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Window:</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{dhanFromDate} → {dhanToDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {dhanStatus && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: dhanStatus.type === 'success' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : dhanStatus.type === 'info' 
                  ? 'rgba(59, 130, 246, 0.12)' 
                  : 'rgba(244, 63, 94, 0.15)',
              color: dhanStatus.type === 'success' 
                ? '#34d399' 
                : dhanStatus.type === 'info' 
                  ? '#60a5fa' 
                  : '#fb7185',
              border: `1px solid ${
                dhanStatus.type === 'success' 
                  ? 'rgba(16, 185, 129, 0.3)' 
                  : dhanStatus.type === 'info' 
                    ? 'rgba(59, 130, 246, 0.25)' 
                    : 'rgba(244, 63, 94, 0.3)'
              }`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {dhanStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span style={{ fontWeight: 600 }}>{dhanStatus.msg}</span>
              </div>
              {dhanStatus.hint && (
                <div style={{ fontSize: '0.725rem', color: '#94a3b8', lineHeight: 1.4, marginTop: '2px' }}>
                  {dhanStatus.hint}
                </div>
              )}
              {dhanStatus.count === 0 && (
                <div style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleSyncDhan(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Sparkles size={12} color="#10b981" />
                    <span>Import Sample Dhan Trades Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
            <button
              onClick={handleTestDhan}
              disabled={dhanLoading || !dhanClientId}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Test Connection
            </button>
            <button
              onClick={() => handleSyncDhan(false)}
              disabled={dhanLoading || !dhanClientId}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <RefreshCw size={15} className={dhanLoading ? 'spin' : ''} />
              <span>Sync Fills</span>
            </button>
          </div>

          {/* Quick Demo Test Sync */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Testing without keys?</span>
            <button
              onClick={() => handleSyncDhan(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem' }}
            >
              <Sparkles size={13} color="#10b981" />
              <span>1-Click Dhan Demo Sync</span>
            </button>
          </div>
        </div>

        {/* 2. ANGEL ONE SMARTAPI CARD */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#ffffff',
                fontSize: '0.9rem'
              }}>
                A
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 700 }}>Angel One SmartAPI</h3>
              </div>
            </div>
            <a 
              href="https://smartapi.angelbroking.com/" 
              target="_blank" 
              rel="noreferrer" 
              style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              SmartAPI Portal <ExternalLink size={12} />
            </a>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Connect with your <strong>SmartAPI Key</strong> and <strong>Client Code</strong> to pull F&O & Equity trade records automatically.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Client Code
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="e.g. S123456"
                  value={angelClientCode}
                  onChange={(e) => setAngelClientCode(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                SmartAPI Key
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  placeholder="Paste your Angel One API Key"
                  value={angelApiKey}
                  onChange={(e) => setAngelApiKey(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>

            {/* Angel One Timeframe / Custom Date Range Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  Sync History Range
                </label>
                <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600 }}>
                  {angelRangeMode === 'CUSTOM' ? 'Custom Range' : `${angelDays} Days`}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', marginBottom: '8px' }}>
                {[
                  { label: '30D', val: 30 },
                  { label: '90D', val: 90 },
                  { label: '180D', val: 180 },
                  { label: '1Y', val: 365 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => { 
                      setAngelRangeMode('PRESET'); 
                      setAngelDays(opt.val); 
                      setAngelFromDate(getPastDateStr(opt.val)); 
                      setAngelToDate(getTodayStr()); 
                    }}
                    style={{
                      padding: '5px 2px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: (angelRangeMode === 'PRESET' && angelDays === opt.val) ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: (angelRangeMode === 'PRESET' && angelDays === opt.val) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: (angelRangeMode === 'PRESET' && angelDays === opt.val) ? '#60a5fa' : '#94a3b8',
                      transition: 'all 0.15s ease',
                      textAlign: 'center'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAngelRangeMode('CUSTOM')}
                  style={{
                    padding: '5px 2px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: angelRangeMode === 'CUSTOM' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: angelRangeMode === 'CUSTOM' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: angelRangeMode === 'CUSTOM' ? '#60a5fa' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    textAlign: 'center'
                  }}
                >
                  Custom
                </button>
              </div>

              {/* Custom Date Range Inputs */}
              {angelRangeMode === 'CUSTOM' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>From Date</label>
                    <input
                      type="date"
                      value={angelFromDate}
                      max={angelToDate || getTodayStr()}
                      onChange={(e) => setAngelFromDate(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>To Date</label>
                    <input
                      type="date"
                      value={angelToDate}
                      min={angelFromDate}
                      max={getTodayStr()}
                      onChange={(e) => setAngelToDate(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 8px' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: '0.725rem',
                  color: '#64748b',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Window:</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{angelFromDate} → {angelToDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {angelStatus && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: angelStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: angelStatus.type === 'success' ? '#34d399' : '#fb7185',
              border: `1px solid ${angelStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}>
              {angelStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{angelStatus.msg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
            <button
              onClick={handleTestAngel}
              disabled={angelLoading || !angelClientCode}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Test Connection
            </button>
            <button
              onClick={() => handleSyncAngel(false)}
              disabled={angelLoading || !angelClientCode}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <RefreshCw size={15} className={angelLoading ? 'spin' : ''} />
              <span>Sync Trades</span>
            </button>
          </div>

          {/* Quick Demo Sync */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Testing without keys?</span>
            <button
              onClick={() => handleSyncAngel(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem' }}
            >
              <Sparkles size={13} color="#3b82f6" />
              <span>1-Click Angel Demo Sync</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. CSV CONTRACT NOTE IMPORTER */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <FileSpreadsheet size={22} color="#f59e0b" />
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
              Bulk CSV & Contract Note Importer
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Drag & drop CSV files exported from Dhan, Angel One, Zerodha, or TradeZella format.
            </p>
          </div>
        </div>

        <form onSubmit={handleUploadCsv} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            border: '2px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '36px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              style={{ display: 'none' }}
              id="csvFileInput"
            />
            <label htmlFor="csvFileInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Upload size={32} color="#94a3b8" />
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                {csvFile ? `Selected: ${csvFile.name}` : 'Click to browse or drop your CSV file here'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Auto-detects symbols, option strikes, trade prices, and computes Indian statutory charges.
              </div>
            </label>
          </div>

          {csvStatus && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: csvStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: csvStatus.type === 'success' ? '#34d399' : '#fb7185',
              border: `1px solid ${csvStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}>
              {csvStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{csvStatus.msg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={!csvFile || csvLoading}
              className="btn btn-primary"
            >
              <Upload size={16} />
              <span>{csvLoading ? 'Importing Trades...' : 'Upload & Process CSV'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
