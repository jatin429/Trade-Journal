const express = require('express');
const router = express.Router();
const { getModels } = require('../models');

/**
 * GET /api/playbooks - List all playbooks with trade count and performance
 */
router.get('/', async (req, res) => {
  try {
    const { Playbook, Trade } = getModels();
    const playbooks = await Playbook.findAll({
      include: [{ model: Trade, as: 'trades', attributes: ['id', 'netPnl', 'status', 'rMultiple'] }],
    });

    const result = playbooks.map(p => {
      const trades = p.trades || [];
      const total = trades.length;
      const wins = trades.filter(t => t.status === 'WIN').length;
      const winRate = total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 0;
      const totalPnl = trades.reduce((acc, t) => acc + (t.netPnl || 0), 0);

      let rules = p.rules;
      if (typeof rules === 'string') {
        try { rules = JSON.parse(rules); } catch (e) { rules = []; }
      }
      if (!Array.isArray(rules)) rules = [];

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        rules,
        targetRR: p.targetRR,
        color: p.color,
        tradesCount: total,
        winRate,
        netPnl: Number(totalPnl.toFixed(2)),
      };
    });

    res.json({ success: true, playbooks: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/playbooks - Create a new playbook setup
 */
router.post('/', async (req, res) => {
  try {
    const { Playbook } = getModels();
    const { name, description, category, rules, targetRR, color } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Playbook name is required' });

    const playbook = await Playbook.create({
      name,
      description,
      category: category || 'General',
      rules: Array.isArray(rules) ? rules : [],
      targetRR: targetRR || 2.0,
      color: color || '#3b82f6',
    });

    res.status(201).json({ success: true, playbook });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/playbooks/:id - Update playbook
 */
router.put('/:id', async (req, res) => {
  try {
    const { Playbook } = getModels();
    const playbook = await Playbook.findByPk(req.params.id);
    if (!playbook) return res.status(404).json({ success: false, error: 'Playbook not found' });

    await playbook.update(req.body);
    res.json({ success: true, playbook });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/playbooks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { Playbook } = getModels();
    const playbook = await Playbook.findByPk(req.params.id);
    if (!playbook) return res.status(404).json({ success: false, error: 'Playbook not found' });

    await playbook.destroy();
    res.json({ success: true, message: 'Playbook deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
