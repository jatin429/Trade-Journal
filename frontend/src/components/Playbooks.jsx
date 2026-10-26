import React, { useState } from 'react';
import { BookOpen, Plus, CheckCircle, Target, Award, Trash2 } from 'lucide-react';
import { createPlaybook, deletePlaybook } from '../services/api';

export default function Playbooks({ playbooks, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Momentum');
  const [description, setDescription] = useState('');
  const [targetRR, setTargetRR] = useState(2.5);
  const [rules, setRules] = useState(['', '', '']);

  const handleRuleChange = (index, value) => {
    const updated = [...rules];
    updated[index] = value;
    setRules(updated);
  };

  const addRuleField = () => {
    setRules([...rules, '']);
  };

  const handleSavePlaybook = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      await createPlaybook({
        name,
        category,
        description,
        targetRR: parseFloat(targetRR),
        rules: rules.filter(r => r.trim() !== ''),
      });
      setShowModal(false);
      setName('');
      setDescription('');
      setRules(['', '', '']);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to save playbook: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this playbook strategy?')) return;
    try {
      await deletePlaybook(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BookOpen size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', color: '#ffffff', fontWeight: 800 }}>
              Trading Playbooks & Setups
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Define setup rules and track which specific strategies produce your edge vs losses.
            </p>
          </div>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-ai" style={{ whiteSpace: 'nowrap' }}>
          <Plus size={16} />
          <span>New Playbook Setup</span>
        </button>
      </div>

      {/* Grid of Playbooks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: '20px',
      }}>
        {(playbooks || []).map((pb) => {
          const isProfit = (pb.netPnl || 0) >= 0;
          return (
            <div 
              key={pb.id} 
              className="glass-panel" 
              style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-ai" style={{ marginBottom: '6px' }}>
                    {pb.category || 'Setup'}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
                    {pb.name}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(pb.id)}
                  style={{ background: 'transparent', border: 'none', color: '#f43f5e', opacity: 0.6, cursor: 'pointer' }}
                  title="Delete strategy"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                {pb.description || 'No description provided.'}
              </p>

              {/* Performance Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Win Rate</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {pb.winRate || 0}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Net P&L</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 800, 
                    color: isProfit ? '#10b981' : '#f43f5e', 
                    fontFamily: 'var(--font-mono)' 
                  }}>
                    {isProfit ? `+₹${(pb.netPnl || 0).toLocaleString('en-IN')}` : `-₹${Math.abs(pb.netPnl || 0).toLocaleString('en-IN')}`}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Target R:R</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    1:{pb.targetRR || 2.0}
                  </div>
                </div>
              </div>

              {/* Setup Rules Checklist */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>
                  Execution Checklist Rules:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(() => {
                    let rulesList = pb.rules;
                    if (typeof rulesList === 'string') {
                      try { rulesList = JSON.parse(rulesList); } catch (e) { rulesList = [rulesList]; }
                    }
                    if (!Array.isArray(rulesList)) rulesList = [];
                    if (rulesList.length === 0) {
                      return <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No rules specified.</span>;
                    }
                    return rulesList.map((rule, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        <CheckCircle size={14} color="#10b981" />
                        <span>{rule}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* New Playbook Modal */}
      {showModal && (
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
          padding: '20px',
        }} onClick={() => setShowModal(false)}>
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#0d121d',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 800, marginBottom: '16px' }}>
              Create New Playbook Strategy
            </h2>

            <form onSubmit={handleSavePlaybook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Strategy Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9:20 AM Short Straddle, Liquidity Sweep"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                    <option value="Momentum">Momentum</option>
                    <option value="Breakout">Breakout</option>
                    <option value="Mean Reversion">Mean Reversion</option>
                    <option value="Options Selling">Options Selling</option>
                    <option value="Scalping">Scalping</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Target Risk:Reward (R)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetRR}
                    onChange={(e) => setTargetRR(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Strategy Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Core market logic, timeframes, and indicators..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Strict Rules Checklist
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rules.map((r, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Rule ${i + 1} (e.g. Wait for 5m candle close)`}
                      value={r}
                      onChange={(e) => handleRuleChange(i, e.target.value)}
                      className="input-field"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addRuleField}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px dashed rgba(255,255,255,0.2)',
                      color: '#94a3b8',
                      padding: '6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    + Add Another Rule
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-ai">
                  Save Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
