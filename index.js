const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');


morgan.token("manila-date", () => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return `${get("day")}/${get("month")}/${get("year")}:${get("hour")}:${get("minute")}:${get("second")} +0800`;
});

morgan.token("client-ip", (req) => {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "";

  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip;
});

dotenv.config();

const { initDatabase } = require('./db/index');
const authRoutes = require('./auth/routes');
const apiRoutes = require('./api/index');
const { startAutoCloseWorker } = require('./scripts/autoClose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(cookieParser());
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(
  morgan(
    ':client-ip - :remote-user [:manila-date] ":method :url HTTP/:http-version" :status :res[content-length]'
  )
);

// Static uploads directory for ticket attachments
const uploadDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'NDMU MIS IT Ticketing System',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Serve static frontend in production if built
const clientDist = path.join(__dirname, 'client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
async function startServer() {
  try {
    console.log('[Server] Connecting to database...');
    await initDatabase();

    // Start background tasks
    startAutoCloseWorker();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` NDMU ICT-MIS Service Desk System API running on port ${PORT}`);
      console.log(` URL: http://localhost:${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('[Fatal Startup Error]:', error);
    // Still listen so client and diagnostic endpoints can respond
    app.listen(PORT, () => {
      console.log(`[Server Warning] API running on port ${PORT} (Database pending connection)`);
    });
  }
}

startServer();
