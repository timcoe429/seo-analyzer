const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
const initializeTables = async () => {
  try {
    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create semrush_reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semrush_reports (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        report_type VARCHAR(100) NOT NULL,
        is_competitor BOOLEAN DEFAULT FALSE,
        file_data JSONB,
        original_file BYTEA,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create analysis_results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        target_keyword VARCHAR(255),
        competitor_url VARCHAR(500),
        is_pillar_post BOOLEAN DEFAULT FALSE,
        analysis_data JSONB NOT NULL,
        competitive_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
};

// Database query helper
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Initialize tables on startup
if (process.env.DATABASE_URL) {
  initializeTables();
}

module.exports = {
  pool,
  query,
  initializeTables
}; 