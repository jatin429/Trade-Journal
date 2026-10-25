import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  BookOpen,
  Zap,
  PlusCircle,
  Bot,
  Sparkles,
  Calendar as CalendarIcon,
  User,
  LogOut,
  ChevronDown,
  Settings,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({
  currentTab,
  setCurrentTab,
  currencyMode,
  setCurrencyMode,
  onOpenLogModal,
  onOpenAiModal,
  currentUser,
  onOpenAuthModal,
  onOpenProfileModal,
  onLogout
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'trades', label: 'Trade Journal', icon: TrendingUp },
    { id: 'brokers', label: 'Broker Hub', icon: Zap },
    { id: 'playbooks', label: 'Playbooks', icon: BookOpen },
    { id: 'journal', label: 'Daily Review', icon: CalendarIcon },
  ];

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 clamp(8px, 2vw, 16px)',
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          {/* Brand */}
          <div
            onClick={() => setCurrentTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
              flexShrink: 0,
            }}>
              <TrendingUp size={19} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.12rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', whiteSpace: 'nowrap' }}>
                  Trade<span style={{ color: '#10b981' }}>Mind</span>
                </span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  PRO
                </span>
              </div>
              <div className="desktop-only" style={{ fontSize: '0.68rem', color: '#64748b', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>Master Your Trades. Master Your Mind.</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Desktop Only */}
          <nav className="desktop-only" style={{
            alignItems: 'center',
            gap: '4px',
            flexShrink: 1,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  onClick={() => {
                    if (!currentUser) {
                      onOpenAuthModal && onOpenAuthModal('register');
                      return;
                    }
                    setCurrentTab(tab.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 11px',
                    borderRadius: '8px',
                    background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: active ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    fontSize: '0.8125rem',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} color={active ? '#10b981' : '#64748b'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: View Mode, Action Buttons & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Currency / R-Multiple Mode Switcher - Desktop (all 3 buttons) */}
            <div className="desktop-only" style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '2px',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              {[
                { id: 'INR', label: '₹ INR' },
                { id: 'R', label: 'R' },
                { id: 'PCT', label: '%' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  id={`btn-mode-${mode.id}`}
                  onClick={() => setCurrencyMode(mode.id)}
                  style={{
                    background: currencyMode === mode.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: currencyMode === mode.id ? '#ffffff' : '#64748b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Currency Switcher - Mobile (single cycle button) */}
            <button
              className="mobile-only"
              id="btn-mode-mobile-toggle"
              onClick={() => {
                const modes = ['INR', 'R', 'PCT'];
                const nextIdx = (modes.indexOf(currencyMode) + 1) % modes.length;
                setCurrencyMode(modes[nextIdx]);
              }}
              title="Switch Currency Display (₹ / R / %)"
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '7px',
                padding: '4px 7px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#34d399',
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span>{currencyMode === 'INR' ? '₹' : currencyMode === 'R' ? 'R' : '%'}</span>
            </button>

            {/* TradeMind AI Copilot Button - Desktop */}
            <button
              id="btn-open-zella-ai"
              onClick={() => onOpenAiModal && onOpenAiModal()}
              className="btn btn-ai desktop-only"
              style={{ fontSize: '0.78rem', padding: '6px 11px', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Sparkles size={14} />
              <span>TradeMind AI</span>
            </button>

            {/* + Log Trade Button */}
            <button
              id="btn-open-log-trade"
              onClick={onOpenLogModal}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '6px 9px', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <PlusCircle size={14} />
              <span className="desktop-only">Log Trade</span>
              <span className="mobile-only">Log</span>
            </button>

            {/* User Profile / Auth Button */}
            {currentUser ? (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  id="btn-user-profile-menu"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px 3px 3px',
                    borderRadius: '30px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {/* Avatar Circle */}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #10b981',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
                    flexShrink: 0,
                  }}>
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt="Avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                        {currentUser.name?.charAt(0)?.toUpperCase() || 'T'}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'left', lineHeight: 1.1, flexShrink: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', maxWidth: '65px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser.name?.split(' ')[0] || 'Trader'}
                    </div>
                    <div className="desktop-only" style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 600 }}>
                      PRO TRADER
                    </div>
                  </div>

                  <ChevronDown size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                </div>

                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '46px',
                      right: 0,
                      width: '240px',
                      background: 'rgba(15, 23, 42, 0.98)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      padding: '8px',
                      boxShadow: '0 15px 35px -5px rgba(0,0,0,0.8), 0 0 25px rgba(0,0,0,0.5)',
                      zIndex: 60,
                      animation: 'fadeIn 0.15s ease'
                    }}
                    onMouseLeave={() => setShowUserDropdown(false)}
                  >
                    {/* User Info Header */}
                    <div style={{ padding: '8px 10px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        {currentUser.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser.email}
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenProfileModal && onOpenProfileModal();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'transparent',
                          color: '#f1f5f9',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <User size={15} color="#10b981" />
                        <span>My Profile & Avatar</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAiModal && onOpenAiModal('Where am I lacking by considering all trades and my behavior? How can I progress?', 'chat');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'transparent',
                          color: '#f1f5f9',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <Sparkles size={15} color="#8b5cf6" />
                        <span>AI Progress Audit</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout && onLogout();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'transparent',
                          color: '#f43f5e',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          marginTop: '4px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(244, 63, 94, 0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <LogOut size={15} color="#f43f5e" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  id="btn-navbar-signin"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94a3b8',
                    padding: '6px 10px',
                    borderRadius: '7px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sign In
                </button>
                <button
                  id="btn-navbar-register"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('register')}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Register (OTP)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav className="mobile-bottom-nav">
        <button
          id="mobile-nav-dashboard"
          className={`mobile-nav-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            if (!currentUser) { onOpenAuthModal && onOpenAuthModal('register'); return; }
            setCurrentTab('dashboard');
          }}
        >
          <BarChart2 size={17} />
          <span>Dashboard</span>
        </button>

        <button
          id="mobile-nav-trades"
          className={`mobile-nav-btn ${currentTab === 'trades' ? 'active' : ''}`}
          onClick={() => {
            if (!currentUser) { onOpenAuthModal && onOpenAuthModal('register'); return; }
            setCurrentTab('trades');
          }}
        >
          <TrendingUp size={17} />
          <span>Trades</span>
        </button>

        <button
          id="mobile-nav-playbooks"
          className={`mobile-nav-btn ${currentTab === 'playbooks' ? 'active' : ''}`}
          onClick={() => {
            if (!currentUser) { onOpenAuthModal && onOpenAuthModal('register'); return; }
            setCurrentTab('playbooks');
          }}
        >
          <BookOpen size={17} />
          <span>Playbooks</span>
        </button>

        {/* Center AI Copilot Action — elevated FAB */}
        <button
          id="mobile-nav-ai"
          className="mobile-nav-btn-ai"
          onClick={() => onOpenAiModal && onOpenAiModal()}
        >
          <div className="ai-fab">
            <Sparkles size={20} />
          </div>
          <span className="ai-label">AI Coach</span>
        </button>

        <button
          id="mobile-nav-journal"
          className={`mobile-nav-btn ${currentTab === 'journal' ? 'active' : ''}`}
          onClick={() => {
            if (!currentUser) { onOpenAuthModal && onOpenAuthModal('register'); return; }
            setCurrentTab('journal');
          }}
        >
          <CalendarIcon size={17} />
          <span>Review</span>
        </button>

        <button
          id="mobile-nav-brokers"
          className={`mobile-nav-btn ${currentTab === 'brokers' ? 'active' : ''}`}
          onClick={() => {
            if (!currentUser) { onOpenAuthModal && onOpenAuthModal('register'); return; }
            setCurrentTab('brokers');
          }}
        >
          <Zap size={17} />
          <span>Brokers</span>
        </button>
      </nav>
    </>
  );
}
