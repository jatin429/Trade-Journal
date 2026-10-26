const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getModels } = require('../models');
const { sendOtpEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'trademind_jwt_secret_key_2026';

// Setup multer storage for profile avatars
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed!'));
  },
});

// Auth Verification Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { User } = getModels();
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

/**
 * POST /api/auth/send-registration-otp
 * Step 1 of Registration: Validates data, generates 6-digit OTP valid for 5 minutes
 */
router.post('/send-registration-otp', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      tradingStyle, 
      experienceLevel, 
      startingCapital 
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const { User, OtpVerification } = getModels();
    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Please sign in instead.' });
    }

    // Generate 6-digit OTP & 5-minute expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes exactly

    // Hash password before saving in pending registration data
    const hashedPassword = await bcrypt.hash(password, 10);

    const pendingData = JSON.stringify({
      name: name || 'TradeMind Trader',
      email: cleanEmail,
      password: hashedPassword,
      tradingStyle: tradingStyle || 'Options Buyer',
      experienceLevel: experienceLevel || 'Intermediate',
      startingCapital: startingCapital ? parseFloat(startingCapital) : 200000,
    });

    // Invalidate prior pending OTPs for this email
    await OtpVerification.update(
      { verified: true },
      { where: { email: cleanEmail, verified: false } }
    );

    // Save new OTP
    await OtpVerification.create({
      email: cleanEmail,
      otp,
      expiresAt,
      registrationData: pendingData,
      verified: false,
    });

    console.log(`[TradeMind OTP] Generated 6-digit code for ${cleanEmail}: ${otp} (Valid until ${expiresAt.toLocaleTimeString()})`);

    // Dispatch OTP to user's real email address
    const emailResult = await sendOtpEmail(cleanEmail, otp);

    if (!emailResult.success && emailResult.unconfigured) {
      console.warn(`[TradeMind Auth] Note: To deliver OTPs directly to ${cleanEmail}, please add EMAIL_USER and EMAIL_PASS to backend/.env`);
    }

    res.json({
      success: true,
      message: emailResult.success 
        ? `Verification code sent to ${cleanEmail}! Please check your Gmail inbox.` 
        : `Verification code sent to ${cleanEmail}! Valid for 5 minutes.`,
      email: cleanEmail,
      expiresAt,
      emailDelivered: emailResult.success,
      warning: emailResult.warning,
    });
  } catch (err) {
    console.error('[Send Registration OTP Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/verify-registration-otp
 * Step 2 of Registration: Confirms 6-digit OTP, creates user account, returns JWT
 */
router.post('/verify-registration-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit verification code are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();
    const { User, OtpVerification } = getModels();

    // Find latest active OTP for this email
    const record = await OtpVerification.findOne({
      where: { email: cleanEmail, verified: false },
      order: [['createdAt', 'DESC']],
    });

    if (!record || record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check the 6-digit OTP and try again.' });
    }

    // Check 5-minute expiration
    const now = new Date();
    if (now > new Date(record.expiresAt)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification code has expired. OTP is strictly valid for 5 minutes. Please request a new code.' 
      });
    }

    // Parse registration data and create user
    const regData = JSON.parse(record.registrationData || '{}');

    // Double check user doesn't already exist
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Account already created. Please sign in.' });
    }

    const newUser = await User.create({
      name: regData.name || 'TradeMind Trader',
      email: cleanEmail,
      password: regData.password,
      tradingStyle: regData.tradingStyle || 'Options Buyer',
      experienceLevel: regData.experienceLevel || 'Intermediate',
      startingCapital: regData.startingCapital || 200000,
      bio: 'Disciplined price action trader mastering mind and risk.',
    });

    // Mark OTP as verified
    record.verified = true;
    await record.save();

    // Issue JWT token (30 days validity)
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = newUser.toJSON();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Email verified and registration confirmed! Welcome to TradeMind.',
    });
  } catch (err) {
    console.error('[Verify Registration OTP Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/resend-registration-otp
 * Resend a fresh 6-digit OTP valid for 5 minutes
 */
router.post('/resend-registration-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const { OtpVerification } = getModels();

    const lastRecord = await OtpVerification.findOne({
      where: { email: cleanEmail, verified: false },
      order: [['createdAt', 'DESC']],
    });

    if (!lastRecord) {
      return res.status(400).json({ success: false, error: 'No pending registration found for this email. Please fill out the registration form.' });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpVerification.create({
      email: cleanEmail,
      otp: newOtp,
      expiresAt: newExpiresAt,
      registrationData: lastRecord.registrationData,
      verified: false,
    });

    console.log(`[TradeMind OTP Resend] Fresh 6-digit code for ${cleanEmail}: ${newOtp}`);

    // Dispatch fresh OTP to email
    const emailResult = await sendOtpEmail(cleanEmail, newOtp);

    res.json({
      success: true,
      message: emailResult.success 
        ? `Fresh verification code sent to ${cleanEmail}! Valid for 5 minutes.` 
        : `Fresh verification code sent! Valid for 5 minutes.`,
      expiresAt: newExpiresAt,
      emailDelivered: emailResult.success,
    });
  } catch (err) {
    console.error('[Resend OTP Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/register (Direct registration fallback)
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      tradingStyle, 
      experienceLevel, 
      startingCapital,
      avatar 
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { User } = getModels();

    // Check if user already exists
    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name || 'TradeMind Trader',
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      tradingStyle: tradingStyle || 'Options Buyer',
      experienceLevel: experienceLevel || 'Intermediate',
      startingCapital: startingCapital ? parseFloat(startingCapital) : 200000,
      avatar: avatar || null,
      bio: 'Disciplined price action trader mastering mind and risk.',
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = newUser.toJSON();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Account created successfully! Welcome to TradeMind.',
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { User } = getModels();
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = user.toJSON();
    delete safeUser.password;

    res.json({
      success: true,
      token,
      user: safeUser,
      message: `Welcome back, ${safeUser.name}!`,
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/quick-demo
 * Fast 1-click test login for convenience
 */
router.post('/quick-demo', async (req, res) => {
  try {
    const { User } = getModels();
    const demoEmail = 'trader@trademind.pro';

    let user = await User.findOne({ where: { email: demoEmail } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('trademind123', 10);
      user = await User.create({
        name: 'Pro Trader',
        email: demoEmail,
        password: hashedPassword,
        bio: 'Professional NIFTY & BANKNIFTY Options Buyer focusing on high R:R setups.',
        tradingStyle: 'F&O Index Options & Momentum',
        experienceLevel: 'Advanced',
        startingCapital: 500000,
        riskPerTrade: 2500,
        maxDailyLoss: 5000,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = user.toJSON();
    delete safeUser.password;

    res.json({
      success: true,
      token,
      user: safeUser,
      message: 'Logged in as Demo Trader!',
    });
  } catch (err) {
    console.error('[Auth Quick-Demo Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * PUT /api/auth/profile
 * Update user profile details
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      bio,
      tradingStyle,
      experienceLevel,
      riskPerTrade,
      maxDailyLoss,
      startingCapital,
      avatar,
    } = req.body;

    const user = req.user;

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (tradingStyle !== undefined) user.tradingStyle = tradingStyle;
    if (experienceLevel !== undefined) user.experienceLevel = experienceLevel;
    if (riskPerTrade !== undefined) user.riskPerTrade = (riskPerTrade === '' || isNaN(parseFloat(riskPerTrade))) ? 0 : parseFloat(riskPerTrade);
    if (maxDailyLoss !== undefined) user.maxDailyLoss = (maxDailyLoss === '' || isNaN(parseFloat(maxDailyLoss))) ? 0 : parseFloat(maxDailyLoss);
    if (startingCapital !== undefined) user.startingCapital = (startingCapital === '' || isNaN(parseFloat(startingCapital))) ? 0 : parseFloat(startingCapital);
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully!',
    });
  } catch (err) {
    console.error('[Auth Update Profile Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/avatar
 * Upload avatar image file
 */
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = req.user;
    user.avatar = avatarUrl;
    await user.save();

    res.json({
      success: true,
      avatarUrl,
      user,
      message: 'Profile image uploaded successfully!',
    });
  } catch (err) {
    console.error('[Auth Avatar Upload Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  router,
  authenticateToken,
};
