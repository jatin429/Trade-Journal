import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  BarChart2, 
  Zap, 
  Clock, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TradeLog from './components/TradeLog';
import BrokerHub from './components/BrokerHub';
import Playbooks from './components/Playbooks';
import DailyJournal from './components/DailyJournal';
import LogTradeModal from './components/LogTradeModal';
import AiCopilotModal from './components/AiCopilotModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import NiftyHeatmap from './components/NiftyHeatmap';
import MarketSentiment from './components/MarketSentiment';

import { 
  getAnalyticsSummary, 
  getCalendarData, 
  getEquityCurve, 
  getBreakdowns, 
  getTrades, 
  getPlaybooks, 
  createTrade, 
  deleteTrade,
  getServerStatus,
  getAuthProfile
} from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currencyMode, setCurrencyMode] = useState('INR'); // 'INR', 'R', 'PCT'
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('register');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [aiInitialTab, setAiInitialTab] = useState('chat');
  const [aiInitialQuery, setAiInitialQuery] = useState(null);
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('trademind_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleOpenAiModal = (query = null, tab = 'chat') => {
    const validQuery = typeof query === 'string' ? query : null;
    const validTab = typeof tab === 'string' ? tab : 'chat';
    if (!currentUser) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    setAiInitialQuery(validQuery);
    setAiInitialTab(validTab);
    setIsAiModalOpen(true);
  };

  const handleOpenLogModal = () => {
    if (!currentUser) {
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
      return;
    }
    setIsLogModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('trademind_token');
    localStorage.removeItem('trademind_user');
    setCurrentUser(null);
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  useEffect(() => {
    const token = localStorage.getItem('trademind_token');
    if (token) {
      getAuthProfile()
        .then(res => {
          if (res.success && res.user) {
            setCurrentUser(res.user);
            localStorage.setItem('trademind_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('trademind_token');
          localStorage.removeItem('trademind_user');
          setCurrentUser(null);
        });
    }
  }, []);

  // Data States
  const [stats, setStats] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [breakdowns, setBreakdowns] = useState({});
  const [trades, setTrades] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [dbDialect, setDbDialect] = useState('MySQL');
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const [
        summaryRes,
        curveRes,
        calRes,
        breakdownRes,
        tradesRes,
        playbooksRes,
        statusRes,
      ] = await Promise.all([
        getAnalyticsSummary().catch(() => ({ stats: null })),
        getEquityCurve().catch(() => ({ curve: [] })),
        getCalendarData().catch(() => ({ calendar: [] })),
        getBreakdowns().catch(() => ({ byStrategy: [], byAsset: [], bySession: [] })),
        getTrades({ limit: 100 }).catch(() => ({ trades: [] })),
        getPlaybooks().catch(() => ({ playbooks: [] })),
        getServerStatus().catch(() => ({ database: 'MySQL', dialect: 'mysql' })),
      ]);

      setStats(summaryRes.stats);
      setEquityCurve(curveRes.curve);
      setCalendarData(calRes.calendar);
      setBreakdowns(breakdownRes);
      setTrades(tradesRes.trades);
      setPlaybooks(playbooksRes.playbooks);
      setDbDialect(statusRes.dialect === 'mysql' ? 'MySQL (phpMyAdmin)' : 'SQLite');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle Trade Creation
  const handleSaveTrade = async (tradeData) => {
    try {
      const res = await createTrade(tradeData);
      if (res.trade?.status === 'WIN') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7']
        });
      }
      fetchAllData();
    } catch (err) {
      alert('Error creating trade: ' + err.message);
    }
  };

  // Handle Trade Deletion
  const handleDeleteTrade = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    try {
      await deleteTrade(id);
      fetchAllData();
    } catch (err) {
      alert('Error deleting trade: ' + err.message);
    }
  };

  // When a date is clicked on the Heatmap Calendar
  const handleSelectDateFromCalendar = (dateStr) => {
    setSelectedFilterDate(dateStr);
    setCurrentTab('trades');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currencyMode={currencyMode}
        setCurrencyMode={setCurrencyMode}
        onOpenLogModal={handleOpenLogModal}
        onOpenAiModal={handleOpenAiModal}
        currentUser={currentUser}
        onOpenAuthModal={(mode = 'login') => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="main-content-container">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#94a3b8' }}>
            <span className="pulse-dot" style={{ background: '#10b981', marginRight: '10px' }} />
            <span>Loading TradeMind — Master Your Trades. Master Your Mind...</span>
          </div>
        ) : !currentUser ? (
          /* Locked State when User is not Registered / Logged In */
          <div style={{
            maxWidth: '920px',
            margin: '20px auto',
            textAlign: 'center',
            padding: 'clamp(24px, 5vw, 52px) clamp(16px, 4vw, 36px)',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 14, 28, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(16, 185, 129, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient Background Aura */}
            <div style={{
              position: 'absolute',
              top: '-120px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '500px',
              height: '350px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Glowing Lock Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '30px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '24px',
              letterSpacing: '0.04em'
            }}>
              <Lock size={15} color="#10b981" />
              <span>TRADING JOURNAL ACCESS LOCKED — REGISTRATION REQUIRED</span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginBottom: '16px'
            }}>
              Master Your Trades. <span style={{ color: '#10b981' }}>Master Your Mind.</span>
            </h1>

            <p style={{
              fontSize: '1.05rem',
              color: '#94a3b8',
              maxWidth: '680px',
              margin: '0 auto 36px auto',
              lineHeight: 1.6
            }}>
              TradeMind requires a verified registration to access your trading journal, execution logs, emotional tracking, and AI insights. Complete 60-second registration with our <strong>5-minute OTP confirmation</strong> to unlock access.
            </p>

            {/* Primary CTA Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '48px'
            }}>
              <button
                id="btn-gate-register"
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="btn btn-primary"
                style={{
                  padding: '14px 30px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Sparkles size={18} />
                <span>Register with 5-Min OTP</span>
                <ArrowRight size={16} />
              </button>

              <button
                id="btn-gate-signin"
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="btn btn-secondary"
                style={{
                  padding: '14px 28px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>Sign In to Existing Account</span>
              </button>
            </div>

            {/* 4 Feature Pillars */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              textAlign: 'left'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ color: '#10b981', marginBottom: '10px' }}>
                  <Clock size={22} />
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  5-Min OTP Security
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Instant 6-digit confirmation code valid for exactly 5 minutes ensures verified account authenticity.
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ color: '#8b5cf6', marginBottom: '10px' }}>
                  <BarChart2 size={22} />
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  Journal & Equity Curve
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Institutional-grade metrics: Win Rate, Profit Factor, R-multiples, and Daily P&L calendar heatmaps.
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ color: '#38bdf8', marginBottom: '10px' }}>
                  <Sparkles size={22} />
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  TradeMind AI Analyst
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Evidence-based AI copilot grounded directly in your trades to uncover leaks, edge, and emotions.
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ color: '#f59e0b', marginBottom: '10px' }}>
                  <Zap size={22} />
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  Direct Broker Sync
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Seamless integration with Dhan and Angel One APIs with zero manual trade logging hassle.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                equityCurve={equityCurve}
                calendarData={calendarData}
                breakdowns={breakdowns}
                currencyMode={currencyMode}
                onSelectDate={handleSelectDateFromCalendar}
                onOpenLogModal={() => setIsLogModalOpen(true)}
                onOpenBrokerHub={() => setCurrentTab('brokers')}
                onOpenAiModal={handleOpenAiModal}
                currentUser={currentUser}
                trades={trades}
                onUpdateUser={(u) => setCurrentUser(u)}
              />
            )}

            {currentTab === 'heatmap' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <NiftyHeatmap defaultTheme="dark" defaultIndex="NIFTY50" />
                <MarketSentiment />
              </div>
            )}

            {currentTab === 'trades' && (
              <TradeLog
                trades={trades}
                stats={stats}
                currentUser={currentUser}
                onDeleteTrade={handleDeleteTrade}
                onOpenLogModal={() => setIsLogModalOpen(true)}
                currencyMode={currencyMode}
                selectedFilterDate={selectedFilterDate}
                onClearDateFilter={() => setSelectedFilterDate(null)}
                onRefresh={fetchAllData}
                onUpdateUser={(u) => setCurrentUser(u)}
              />
            )}

            {currentTab === 'brokers' && (
              <BrokerHub
                onSyncSuccess={fetchAllData}
              />
            )}

            {currentTab === 'playbooks' && (
              <Playbooks
                playbooks={playbooks}
                onRefresh={fetchAllData}
              />
            )}

            {currentTab === 'journal' && (
              <DailyJournal />
            )}
          </>
        )}
      </main>

      {/* Log Trade Modal */}
      <LogTradeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSave={handleSaveTrade}
        playbooks={playbooks}
      />

      {/* TradeMind AI Analyst Drawer */}
      <AiCopilotModal
        isOpen={isAiModalOpen}
        onClose={() => {
          setIsAiModalOpen(false);
          setAiInitialQuery(null);
        }}
        initialTab={aiInitialTab}
        initialQuery={aiInitialQuery}
      />

      {/* Auth Modal (Login & Sign Up with 5-Minute OTP Verification) */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        isMandatoryGate={!currentUser}
        initialMode={authModalMode}
        onClose={currentUser ? () => setIsAuthModalOpen(false) : null}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          fetchAllData();
        }}
      />

      {/* Profile & Avatar Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
        }}
      />

    </div>
  );
}
