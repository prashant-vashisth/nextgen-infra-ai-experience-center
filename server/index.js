require('dotenv').config();
const express = require('express');
const cors = require('cors');

const groqRoutes = require('./routes/groq');
const azureRoutes = require('./routes/azure');
const githubRoutes = require('./routes/github');
const servicenowRoutes = require('./routes/servicenow');
const batchRoutes = require('./routes/batch');
const idaRoutes = require('./routes/ida');
const aksRoutes = require('./routes/aks');
const eventsRoutes = require('./routes/events');
const finopsRoutes = require('./routes/finops');
const cloudopsRoutes = require('./routes/cloudops');
const dependenciesRoutes = require('./routes/dependencies');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      groq: !!process.env.GROQ_API_KEY,
      github: !!process.env.GITHUB_TOKEN,
      azure: !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET),
      servicenow: !!process.env.SNOW_INSTANCE,
    }
  });
});

app.use('/api/groq', groqRoutes);
app.use('/api/azure', azureRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/snow', servicenowRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/ida', idaRoutes);
app.use('/api/aks', aksRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/finops', finopsRoutes);
app.use('/api/cloudops', cloudopsRoutes);
app.use('/api/deps', dependenciesRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Humana AI Ops Backend running on port ${PORT}`);
  console.log(`   Groq: ${process.env.GROQ_API_KEY ? '✅ configured' : '⚠️  missing'}`);
  console.log(`   GitHub: ${process.env.GITHUB_TOKEN ? '✅ configured' : '⚠️  missing'}`);
  console.log(`   Azure: ${process.env.AZURE_CLIENT_ID ? '✅ configured' : '⚠️  missing'}`);
  console.log(`   ServiceNow: ${process.env.SNOW_INSTANCE ? '✅ configured' : '⚠️  missing'}`);
});
