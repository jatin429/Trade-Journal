import React, { useState, useEffect } from 'react';
import { Calendar, Star, Compass, Smile, Save, CheckCircle2 } from 'lucide-react';
import { getJournalByDate, saveJournal } from '../services/api';

export default function DailyJournal() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [marketOutlook, setMarketOutlook] = useState('Bullish');
  const [preMarketPrep, setPreMarketPrep] = useState('');
  const [postMarketReview, setPostMarketReview] = useState('');
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [emotionalState, setEmotionalState] = useState('Calm & Focused');
  const [dailyTargetPnl, setDailyTargetPnl] = useState(10000);
  const [maxDailyRisk, setMaxDailyRisk] = useState(4000);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadJournal(selectedDate);
  }, [selectedDate]);

  const loadJournal = async (date) => {
    try {
      const res = await getJournalByDate(date);
      if (res.journal) {
        setMarketOutlook(res.journal.marketOutlook || 'Bullish');
        setPreMarketPrep(res.journal.preMarketPrep || '');
        setPostMarketReview(res.journal.postMarketReview || '');
        setDisciplineRating(res.journal.disciplineRating || 5);
        setEmotionalState(res.journal.emotionalState || 'Calm & Focused');
        setDailyTargetPnl(res.journal.dailyTargetPnl || 10000);
        setMaxDailyRisk(res.journal.maxDailyRisk || 4000);
      } else {
        setPreMarketPrep('');
        setPostMarketReview('');
        setDisciplineRating(5);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveJournal({
        date: selectedDate,
        marketOutlook,
        preMarketPrep,
        postMarketReview,
        disciplineRating,
        emotionalState,
        dailyTargetPnl: parseFloat(dailyTargetPnl),
        maxDailyRisk: parseFloat(maxDailyRisk),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Error saving journal: ' + err.message);
    }
  };

  return (
    <div className="daily-journal-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px', width: '100%', maxWidth: '100%' }}>
      
      {/* Header Banner */}
      <div className="glass-panel daily-journal-header" style={{
        padding: 'clamp(16px, 3vw, 24px)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 280px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={20} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', color: '#ffffff', fontWeight: 800, margin: 0, lineHeight: 1.25 }}>
              Daily Routine & Psychology Review
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.35 }}>
              Master your mental clarity, risk management, and daily execution rules.
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="daily-journal-date-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>Session Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field font-mono"
            style={{ width: '150px', padding: '6px 10px', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        
        {/* Top Controls: Outlook, Mindset, Star Rating */}
        <div className="daily-journal-controls-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '14px',
          width: '100%',
        }}>
          {/* Market Bias / Outlook */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Compass size={14} color="#38bdf8" />
              Pre-Market Bias
            </label>
            <select
              value={marketOutlook}
              onChange={(e) => setMarketOutlook(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="Bullish">🟢 Bullish Momentum</option>
              <option value="Bearish">🔴 Bearish Trend</option>
              <option value="Sideways">🟡 Rangebound / Sideways</option>
              <option value="Volatile">⚡ High Volatility / Event Day</option>
            </select>
          </div>

          {/* Emotional State */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Smile size={14} color="#8b5cf6" />
              Mental & Emotional State
            </label>
            <select
              value={emotionalState}
              onChange={(e) => setEmotionalState(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="Calm & Focused">🧘 Calm & Focused</option>
              <option value="Patient & Waiting">⏳ Patient & Waiting for Setup</option>
              <option value="Anxious / Hesitant">⚠️ Anxious / Hesitant</option>
              <option value="FOMO-Prone">🔥 FOMO / Rushing</option>
              <option value="Frustrated / Revenge">🚨 Frustrated / Revenge-Prone</option>
            </select>
          </div>

          {/* Discipline Rating */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Star size={14} color="#f59e0b" />
              Discipline Rating
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setDisciplineRating(star)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    transition: 'transform 0.15s ease',
                  }}
                  title={`Rate ${star} Stars`}
                >
                  <Star
                    size={22}
                    color={star <= disciplineRating ? '#f59e0b' : '#334155'}
                    fill={star <= disciplineRating ? '#f59e0b' : 'none'}
                  />
                </button>
              ))}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginLeft: '4px' }}>
                {disciplineRating} / 5
              </span>
            </div>
          </div>
        </div>

        {/* Notes Grid: Pre-Market Plan vs Post-Market Review */}
        <div className="daily-journal-notes-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '16px',
          width: '100%',
        }}>
          {/* Pre-Market Prep */}
          <div className="glass-panel" style={{ padding: 'clamp(16px, 3vw, 22px)' }}>
            <h3 style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}>
              🌅 Pre-Market Routine & Thesis
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.4 }}>
              Major support/resistance, CPR width, Gift Nifty cues, and specific setups you are hunting.
            </p>
            <textarea
              rows="7"
              value={preMarketPrep}
              onChange={(e) => setPreMarketPrep(e.target.value)}
              placeholder="e.g. Nifty key pivot at 24,550. If 15m candle closes above, take 24,600 CE. Maximum 2 trades today..."
              className="input-field"
              style={{ lineHeight: 1.6, width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Post-Market Review */}
          <div className="glass-panel" style={{ padding: 'clamp(16px, 3vw, 22px)' }}>
            <h3 style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: 700, marginBottom: '4px' }}>
              🌙 Post-Market Review & Lessons
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.4 }}>
              Did you follow your stop-losses? Did you let winners run? What can be improved tomorrow?
            </p>
            <textarea
              rows="7"
              value={postMarketReview}
              onChange={(e) => setPostMarketReview(e.target.value)}
              placeholder="e.g. Executed ORB cleanly on Nifty. Avoided overtrading in the afternoon. Locked in profits at 1:2 R:R..."
              className="input-field"
              style={{ lineHeight: 1.6, width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="daily-journal-save-bar" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '4px'
        }}>
          {savedSuccess && (
            <span style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              Session notes saved to database!
            </span>
          )}
          <button type="submit" className="btn btn-primary daily-journal-save-btn" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
            <Save size={16} />
            <span>Save Session Review</span>
          </button>
        </div>

      </form>

    </div>
  );
}
