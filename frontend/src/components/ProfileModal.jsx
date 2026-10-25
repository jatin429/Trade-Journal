import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  User, 
  Mail, 
  Shield, 
  Target, 
  DollarSign, 
  Award, 
  CheckCircle2, 
  Sparkles, 
  Trash2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { updateAuthProfile, uploadAvatar } from '../services/api';

const PRESET_AVATARS = [
  { id: 'bull', label: 'Bull Trader', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150&auto=format&fit=crop&q=80' },
  { id: 'bear', label: 'Bear Hunter', url: 'https://images.unsplash.com/photo-1579227114347-15d08fc37cae?w=150&auto=format&fit=crop&q=80' },
  { id: 'pro', label: 'Execution Pro', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'falcon', label: 'Falcon Eye', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'mind', label: 'Mind Master', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
];

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [name, setName] = useState(user?.name || 'TradeMind Trader');
  const [email, setEmail] = useState(user?.email || 'trader@trademind.pro');
  const [bio, setBio] = useState(user?.bio || 'Disciplined price action trader mastering mind and risk.');
  const [tradingStyle, setTradingStyle] = useState(user?.tradingStyle || 'F&O Index Options & Momentum');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'Intermediate');
  const [riskPerTrade, setRiskPerTrade] = useState(user?.riskPerTrade !== undefined && user?.riskPerTrade !== null ? user.riskPerTrade : 2000);
  const [maxDailyLoss, setMaxDailyLoss] = useState(user?.maxDailyLoss !== undefined && user?.maxDailyLoss !== null ? user.maxDailyLoss : 5000);
  const [startingCapital, setStartingCapital] = useState(user?.startingCapital !== undefined && user?.startingCapital !== null ? user.startingCapital : 0);
  const [avatar, setAvatar] = useState(user?.avatar || null);

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  // Synchronize state when user prop updates or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setName(user.name ?? 'TradeMind Trader');
      setEmail(user.email ?? 'trader@trademind.pro');
      setBio(user.bio ?? 'Disciplined price action trader mastering mind and risk.');
      setTradingStyle(user.tradingStyle ?? 'F&O Index Options & Momentum');
      setExperienceLevel(user.experienceLevel ?? 'Intermediate');
      setRiskPerTrade(user.riskPerTrade !== undefined && user.riskPerTrade !== null ? user.riskPerTrade : 2000);
      setMaxDailyLoss(user.maxDailyLoss !== undefined && user.maxDailyLoss !== null ? user.maxDailyLoss : 5000);
      setStartingCapital(user.startingCapital !== undefined && user.startingCapital !== null ? user.startingCapital : 0);
      setAvatar(user.avatar ?? null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // Handle local image file upload
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit');
      return;
    }

    setUploadingImage(true);
    setErrorMsg('');

    try {
      // 1. Preview immediately via FileReader
      const reader = new FileReader();
      reader.onload = async (event) => {
        const previewUrl = event.target.result;
        setAvatar(previewUrl);

        // 2. Upload to backend if token exists
        const token = localStorage.getItem('trademind_token');
        if (token) {
          const formData = new FormData();
          formData.append('avatar', file);

          try {
            const res = await uploadAvatar(formData);
            if (res.success && res.avatarUrl) {
              const fullUrl = `http://localhost:5000${res.avatarUrl}`;
              setAvatar(fullUrl);
              setSuccessMsg('Profile picture uploaded and saved!');
            }
          } catch (uploadErr) {
            console.warn('Backend upload failed, keeping base64 avatar:', uploadErr);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMsg('Failed to process image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectPreset = (url) => {
    setAvatar(url);
    setSuccessMsg('Avatar selected! Click "Save Changes" to apply.');
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setSuccessMsg('Avatar removed.');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const parsedCapital = startingCapital === '' || isNaN(parseFloat(startingCapital)) ? 0 : parseFloat(startingCapital);
      const parsedRisk = riskPerTrade === '' || isNaN(parseFloat(riskPerTrade)) ? 0 : parseFloat(riskPerTrade);
      const parsedLoss = maxDailyLoss === '' || isNaN(parseFloat(maxDailyLoss)) ? 0 : parseFloat(maxDailyLoss);

      const payload = {
        name: (name || '').trim() || 'TradeMind Trader',
        bio: (bio || '').trim(),
        tradingStyle,
        experienceLevel,
        riskPerTrade: parsedRisk,
        maxDailyLoss: parsedLoss,
        startingCapital: parsedCapital,
        avatar,
      };

      const token = localStorage.getItem('trademind_token');
      let updatedUser = { ...user, ...payload };

      if (token) {
        const res = await updateAuthProfile(payload);
        if (res.success) {
          updatedUser = res.user;
        }
      }

      localStorage.setItem('trademind_user', JSON.stringify(updatedUser));

      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#10b981', '#8b5cf6']
      });

      setSuccessMsg('Profile and preferences updated successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '12px',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        padding: 'clamp(18px, 4vw, 32px)',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 14, 28, 0.98) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(139, 92, 246, 0.1)',
        position: 'relative',
        maxHeight: '94vh',
        overflowY: 'auto'
      }}>
        
        {/* Close Button */}
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
          }}>
            <User size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Trader Profile & Avatar
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Manage your personal identity, risk parameters, and avatar
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
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
            fontSize: '0.825rem'
          }}>
            {errorMsg}
          </div>
        )}

        {/* SECTION 1: PROFILE IMAGE UPLOAD */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Profile Picture
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar Circle Display */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                border: '3px solid #10b981',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt="Trader Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                    {name?.charAt(0)?.toUpperCase() || 'T'}
                  </span>
                )}
              </div>

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  border: '2px solid #0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}
                title="Upload Photo"
              >
                <Camera size={16} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Upload Buttons & Options */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={14} color="#10b981" />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Image from Computer'}</span>
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      color: '#f43f5e',
                      borderColor: 'rgba(244, 63, 94, 0.3)',
                      cursor: 'pointer'
                    }}
                    title="Remove Photo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.725rem', color: '#64748b' }}>
                Supports JPG, PNG, WEBP up to 5MB. Your image will be shown across your journal dashboard and AI copilot interactions.
              </p>

              {/* Or Choose Preset Avatars */}
              <div style={{ marginTop: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                  OR SELECT PRO TRADER PRESET:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PRESET_AVATARS.map((p) => (
                    <img
                      key={p.id}
                      src={p.url}
                      alt={p.label}
                      title={p.label}
                      onClick={() => handleSelectPreset(p.url)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: avatar === p.url ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.15)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1.0)'}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 2: TRADER DETAILS & RISK LIMITS */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                TRADER DISPLAY NAME
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                REGISTERED EMAIL (ACCOUNT ID)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="input-field"
                style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              TRADING CREED / PHILOSOPHY
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Cut losers at 1R. Let winners run to 2R target."
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                PRIMARY STYLE
              </label>
              <select
                value={tradingStyle}
                onChange={(e) => setTradingStyle(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="F&O Index Options & Momentum">F&O Index Options Buyer</option>
                <option value="Options Selling & Non-Directional">Options Seller</option>
                <option value="Equity Intraday Price Action">Equity Intraday Scalper</option>
                <option value="Futures & Swing Trader">Futures & Swing</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                EXPERIENCE LEVEL
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

          {/* Risk Management Boundaries for AI Coach */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Shield size={16} color="#10b981" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                AI Risk Limits & Hard Stops
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Risk Per Trade (1R Limit in ₹)
                </label>
                <input
                  type="number"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Max Daily Loss Cap (₹)
                </label>
                <input
                  type="number"
                  value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '8px' }}>
              TradeMind AI will audit your executions against these thresholds and alert you when trades exceed 1R.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '10px 18px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                fontSize: '0.85rem',
                padding: '10px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <span className="pulse-dot" style={{ background: '#ffffff' }} />
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
