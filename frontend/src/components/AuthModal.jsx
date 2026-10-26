import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  KeyRound,
  RotateCcw,
  Clock,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  loginUser, 
  sendRegistrationOtp, 
  verifyRegistrationOtp, 
  resendRegistrationOtp 
} from '../services/api';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthSuccess, 
  isMandatoryGate = false,
  initialMode = 'register'
}) {
  if (!isOpen) return null;

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [regStep, setRegStep] = useState('form'); // 'form' | 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync mode with initialMode if it changes while opening
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
      setRegStep('form');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [initialMode, isOpen]);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tradingStyle, setTradingStyle] = useState('Options Buyer');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [startingCapital, setStartingCapital] = useState(200000);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300); // 5 minutes = 300s

  // Countdown timer for 5 minutes
  useEffect(() => {
    let timer = null;
    if (regStep === 'otp' && otpSecondsLeft > 0) {
      timer = setInterval(() => {
        setOtpSecondsLeft(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [regStep, otpSecondsLeft]);

  // Format seconds as MM:SS
  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      if (res.success && res.token) {
        localStorage.setItem('trademind_token', res.token);
        localStorage.setItem('trademind_user', JSON.stringify(res.user));

        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#8b5cf6', '#3b82f6']
        });

        if (onAuthSuccess) {
          onAuthSuccess(res.user);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await sendRegistrationOtp({
        name,
        email,
        password,
        tradingStyle,
        experienceLevel,
        startingCapital: parseFloat(startingCapital),
      });

      if (res.success) {
        setRegStep('otp');
        setOtpSecondsLeft(300); // 5-minute timer start
        setOtpCode('');
        setSuccessMsg(res.message || `Verification code sent to ${email}! Valid for 5 minutes.`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Step 2: Confirm OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit verification code');
      setLoading(false);
      return;
    }

    try {
      const res = await verifyRegistrationOtp({
        email,
        otp: otpCode.trim(),
      });

      if (res.success && res.token) {
        localStorage.setItem('trademind_token', res.token);
        localStorage.setItem('trademind_user', JSON.stringify(res.user));

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7']
        });

        if (onAuthSuccess) {
          onAuthSuccess(res.user);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setResending(true);

    try {
      const res = await resendRegistrationOtp({ email });
      if (res.success) {
        setOtpSecondsLeft(300); // Reset timer to 5 minutes
        setSuccessMsg(res.message || 'Fresh 6-digit code sent to your email! Valid for 5 minutes.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '12px',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '490px',
        width: '100%',
        padding: 'clamp(20px, 4vw, 32px)',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.97) 0%, rgba(9, 14, 28, 0.99) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(16, 185, 129, 0.12)',
        position: 'relative',
        maxHeight: '95vh',
        overflowY: 'auto'
      }}>
        
        {/* Close Button - Only shown if NOT in mandatory access gate mode */}
        {!isMandatoryGate && onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
            marginBottom: '12px'
          }}>
            <TrendingUp size={26} color="#ffffff" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Sign In to TradeMind' : regStep === 'otp' ? 'Confirm OTP Verification' : 'Create Trader Account'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Master Your Trades. Master Your Mind.
          </p>

          {isMandatoryGate && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              marginTop: '10px',
              fontSize: '0.725rem',
              color: '#34d399',
              fontWeight: 600
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Authentication Required to Access Private Journal</span>
            </div>
          )}
        </div>

        {/* Mode Switcher Tabs (Only visible when not on OTP confirmation step) */}
        {regStep !== 'otp' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'register' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: mode === 'register' ? '#10b981' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Create Account (OTP)
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'login' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: mode === 'login' ? '#10b981' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Sign In
            </button>
          </div>
        )}


        {/* Feedback Alerts */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            color: '#10b981',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            color: '#f43f5e',
            fontSize: '0.825rem',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* =======================================================
            VIEW 1: SIGN IN FORM
           ======================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '38px', paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <span className="pulse-dot" style={{ background: '#ffffff' }} />
              ) : (
                <>
                  <span>Sign In to TradeMind</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
              Don't have an account yet?{' '}
              <span
                onClick={() => { setMode('register'); setRegStep('form'); setErrorMsg(''); }}
                style={{ color: '#10b981', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Register with Email OTP
              </span>
            </div>
          </form>
        )}

        {/* =======================================================
            VIEW 2: REGISTRATION STEP 1 - DETAILS FORM
           ======================================================= */}
        {mode === 'register' && regStep === 'form' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                FULL NAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                EMAIL ADDRESS (OTP WILL BE SENT HERE)
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                PASSWORD (MIN 6 CHARACTERS)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Create secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '38px', paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                PRIMARY TRADING SEGMENT
              </label>
              <select
                value={tradingStyle}
                onChange={(e) => setTradingStyle(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="Options Buyer">Options Buyer</option>
                <option value="Options Selling & Non-Directional">Options Seller (Strangles / Straddles)</option>
                <option value="Equity Intraday Price Action">Equity Intraday Scalper</option>
                <option value="Futures & Swing Trader">Index & Stock Futures Trader</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  EXPERIENCE
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="Beginner">Beginner (&lt; 1 yr)</option>
                  <option value="Intermediate">Intermediate (1-3 yrs)</option>
                  <option value="Advanced">Advanced (3+ yrs)</option>
                  <option value="Full-time Pro">Full-Time Pro</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  STARTING CAPITAL (₹)
                </label>
                <input
                  type="number"
                  value={startingCapital}
                  onChange={(e) => setStartingCapital(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <span className="pulse-dot" style={{ background: '#ffffff' }} />
              ) : (
                <>
                  <span>Send 6-Digit OTP to Register</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
              Already registered?{' '}
              <span
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                style={{ color: '#10b981', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign In here
              </span>
            </div>
          </form>
        )}

        {/* =======================================================
            VIEW 3: REGISTRATION STEP 2 - OTP CONFIRMATION (5-MIN)
           ======================================================= */}
        {mode === 'register' && regStep === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1.5px solid #10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <Mail size={24} color="#10b981" />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Check Your Gmail Inbox
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>
                We've sent a 6-digit verification code to <strong style={{ color: '#f8fafc' }}>{email}</strong>.<br />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Please check your Gmail inbox (and Spam or Updates folder).</span>
              </p>

              {/* 5-Minute Timer Display */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: otpSecondsLeft > 60 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.15)',
                border: otpSecondsLeft > 60 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.4)',
                color: otpSecondsLeft > 60 ? '#10b981' : '#f43f5e',
                fontWeight: 700,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)'
              }}>
                <Clock size={16} />
                <span>{otpSecondsLeft > 0 ? `Code expires in: ${formatTimer(otpSecondsLeft)}` : 'Code Expired'}</span>
              </div>
            </div>

            {/* OTP Input Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textAlign: 'center' }}>
                ENTER 6-DIGIT CODE
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="input-field"
                style={{
                  width: '100%',
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '12px',
                  textAlign: 'center',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  borderColor: otpCode.length === 6 ? '#10b981' : 'rgba(255, 255, 255, 0.15)'
                }}
              />
            </div>

            {/* Confirm Registration Button */}
            <button
              type="submit"
              disabled={loading || otpSecondsLeft === 0 || otpCode.length !== 6}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: otpCode.length === 6 ? 'pointer' : 'not-allowed',
                opacity: otpCode.length === 6 ? 1 : 0.6
              }}
            >
              {loading ? (
                <span className="pulse-dot" style={{ background: '#ffffff' }} />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirm Registration & Activate</span>
                </>
              )}
            </button>

            {/* Resend and Edit Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setRegStep('form')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  textDecoration: 'underline'
                }}
              >
                ← Change Email or Details
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={13} />
                <span>{resending ? 'Sending...' : 'Resend Code'}</span>
              </button>
            </div>

          </form>
        )}

        {/* Footer Guarantee */}
        <div style={{
          marginTop: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.725rem',
          color: '#64748b',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '14px'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Encrypted Passwords & Isolated Journal Records</span>
        </div>

      </div>
    </div>
  );
}
