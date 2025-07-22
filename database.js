const { Pool } = require('pg');

// PostgreSQL connection for Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Projects table - groups reports together
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        your_domain VARCHAR(255) NOT NULL,
        competitor_domain VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SEMrush reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semrush_reports (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        report_type VARCHAR(100) NOT NULL, -- 'domain_overview', 'keyword_gap', 'backlink_gap', etc.
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(10) NOT NULL, -- 'csv' or 'pdf'
        is_competitor BOOLEAN DEFAULT FALSE,
        raw_data JSONB,
        parsed_data JSONB,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analysis results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        your_url VARCHAR(500),
        competitor_url VARCHAR(500),
        target_keyword VARCHAR(255),
        is_pillar_post BOOLEAN DEFAULT FALSE,
        onpage_analysis JSONB,
        competitor_analysis JSONB,
        comparison_results JSONB,
        semrush_insights JSONB,
        competitive_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Project management functions
async function createProject(name, yourDomain, competitorDomain = null) {
  const result = await pool.query(
    'INSERT INTO projects (name, your_domain, competitor_domain) VALUES ($1, $2, $3) RETURNING *',
    [name, yourDomain, competitorDomain]
  );
  return result.rows[0];
}

async function getProject(projectId) {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  return result.rows[0];
}

async function getProjectReports(projectId) {
  const result = await pool.query(
    'SELECT * FROM semrush_reports WHERE project_id = $1 ORDER BY uploaded_at DESC',
    [projectId]
  );
  return result.rows;
}

// SEMrush report functions
async function saveReport(projectId, reportType, fileName, fileType, isCompetitor, rawData, parsedData) {
  const result = await pool.query(
    `INSERT INTO semrush_reports (project_id, report_type, file_name, file_type, is_competitor, raw_data, parsed_data) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [projectId, reportType, fileName, fileType, isCompetitor, rawData, parsedData]
  );
  return result.rows[0];
}

async function getReportsByType(projectId, reportType, isCompetitor = false) {
  const result = await pool.query(
    'SELECT * FROM semrush_reports WHERE project_id = $1 AND report_type = $2 AND is_competitor = $3',
    [projectId, reportType, isCompetitor]
  );
  return result.rows;
}

// Analysis results functions
async function saveAnalysisResult(projectId, analysisData) {
  const {
    yourUrl,
    competitorUrl,
    targetKeyword,
    isPillarPost,
    onpageAnalysis,
    competitorAnalysis,
    comparisonResults,
    semrushInsights,
    competitiveScore
  } = analysisData;

  const result = await pool.query(
    `INSERT INTO analysis_results 
     (project_id, your_url, competitor_url, target_keyword, is_pillar_post, 
      onpage_analysis, competitor_analysis, comparison_results, semrush_insights, competitive_score) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      projectId, yourUrl, competitorUrl, targetKeyword, isPillarPost,
      JSON.stringify(onpageAnalysis), JSON.stringify(competitorAnalysis),
      JSON.stringify(comparisonResults), JSON.stringify(semrushInsights), competitiveScore
    ]
  );
  return result.rows[0];
}

async function getLatestAnalysis(projectId) {
  const result = await pool.query(
    'SELECT * FROM analysis_results WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
    [projectId]
  );
  return result.rows[0];
}

async function getAllProjects() {
  const result = await pool.query(
    'SELECT *, (SELECT COUNT(*) FROM semrush_reports WHERE project_id = projects.id) as report_count FROM projects ORDER BY updated_at DESC'
  );
  return result.rows;
}

module.exports = {
  pool,
  initializeDatabase,
  createProject,
  getProject,
  getProjectReports,
  saveReport,
  getReportsByType,
  saveAnalysisResult,
  getLatestAnalysis,
  getAllProjects
}; 