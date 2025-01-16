// Azure PostgreSQL configuration
export const dbConfig = {
  host: 'tender-tracking-db2.postgres.database.azure.com',
  database: 'postgres',
  user: 'abouefletouhm',
  port: 5432,
  password: process.env.PGPASSWORD || '',
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool configuration
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};