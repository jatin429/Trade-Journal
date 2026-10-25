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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', color: '#ffffff', fontWeight: 800 }}>
              Daily Routine & Psychology Journal
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              The highest edge in trading is mental clarity, risk management, and discipline.
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Session Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field font-mono"
            style={{ width: '160px' }}
          />
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Controls: Outlook, Mindset, Star Rating */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {/* Market Bias / Outlook */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Compass size={14} color="#38bdf8" />
              Pre-Market Bias
            </label>
            <select
              value={marketOutlook}
              onChange={(e) => setMarketOutlook(e.target.value)}
              className="input-field"
            >
              <option value="Bullish">🟢 Bullish Momentum</option>
              <option value="Bearish">🔴 Bearish Trend</option>
              <option value="Sideways">🟡 Rangebound / Sideways</option>
              <option value="Volatile">⚡ High Volatility / Event Day</option>
            </select>
          </div>

          {/* Emotional State */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Smile size={14} color="#8b5cf6" />
              Mental & Emotional State
            </label>
            <select
              value={emotionalState}
              onChange={(e) => setEmotionalState(e.target.value)}
              className="input-field"
            >
              <option value="Calm & Focused">🧘 Calm & Focused</option>
              <option value="Patient & Waiting">⏳ Patient & Waiting for Setup</option>
              <option value="Anxious / Hesitant">⚠️ Anxious / Hesitant</option>
              <option value="FOMO-Prone">🔥 FOMO / Rushing</option>
              <option value="Frustrated / Revenge">🚨 Frustrated / Revenge-Prone</option>
            </select>
          </div>

          {/* Discipline Rating */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Star size={14} color="#f59e0b" />
              Discipline Rating (1-5 Stars)
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
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
                >
                  <Star
                    size={24}
                    color={star <= disciplineRating ? '#f59e0b' : '#334155'}
                    fill={star <= disciplineRating ? '#f59e0b' : 'none'}
                  />
                </button>
              ))}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginLeft: '6px' }}>
                {disciplineRating} / 5
              </span>
            </div>
          </div>
        </div>

        {/* Notes Grid: Pre-Market Plan vs Post-Market Review */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px',
        }}>
          {/* Pre-Market Prep */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
              🌅 Pre-Market Routine & Thesis
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
              Major support/resistance, CPR width, Gift Nifty cues, and specific setups you are hunting.
            </p>
            <textarea
              rows="8"
              value={preMarketPrep}
              onChange={(e) => setPreMarketPrep(e.target.value)}
              placeholder="e.g. Nifty key pivot at 24,550. If 15m candle closes above, take 24,600 CE. Maximum 2 trades today..."
              className="input-field"
              style={{ lineHeight: 1.6 }}
            />
          </div>

          {/* Post-Market Review */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
              🌙 Post-Market Review & Lessons
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
              Did you follow your stop-losses? Did you let winners run? What can be improved tomorrow?
            </p>
            <textarea
              rows="8"
              value={postMarketReview}
              onChange={(e) => setPostMarketReview(e.target.value)}
              placeholder="e.g. Executed ORB cleanly on Nifty. Avoided overtrading in the afternoon. Locked in profits at 1:2 R:R..."
              className="input-field"
              style={{ lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
          {savedSuccess && (
            <span style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              Session notes saved to database!
            </span>
          )}
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <Save size={16} />
            <span>Save Session Review</span>
          </button>
        </div>

      </form>

    </div>
  );
}
