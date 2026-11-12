const http = require('http');
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const { initSocket } = require('./socket/socketManager');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const queueRoutes = require('./routes/queueRoutes');
const referralRoutes = require('./routes/referralRoutes');
const aiRoutes = require('./routes/aiRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server, config.corsOrigin);

// Core Middlewares
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'AI Hospital Queue & Patient Flow Manager API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server
if (require.main === module) {
  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🏥 AI Hospital Queue & Patient Flow Server running!`);
    console.log(`📍 Port: http://localhost:${config.port}`);
    console.log(`⚡ Real-Time Socket.IO: Activated`);
    console.log(`🌐 CORS Allowed Origin: ${config.corsOrigin}`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, server };
