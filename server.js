import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';
import pg from 'pg';
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Enable gzip compression
app.use(compression());
app.use(express.json());

// Database configuration using environment variables
const dbConfig = {
  host: 'tender-tracking-db2.postgres.database.azure.com',
  database: 'postgres',
  user: 'abouefletouhm',
  port: 5432,
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Health check endpoint with detailed status
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error);
    dbError = error.message;
  }

  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    error: dbError,
    uptime: process.uptime(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user
    }
  });
});

// Database query endpoint
app.post('/api/query', async (req, res) => {
  let client;
  try {
    const { text, params } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: true,
        message: 'Query text is required'
      });
    }

    client = await pool.connect();
    const result = await client.query(text, params);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ 
      error: true,
      message: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Serve static files
app.use(express.static(join(__dirname)));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  if (pool) {
    try {
      await pool.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Initialize server
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/api/health`);
      console.log('Environment:', {
        nodeEnv: process.env.NODE_ENV,
        port: PORT,
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();