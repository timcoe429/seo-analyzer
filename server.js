const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// In-memory storage for analysis session
let analysisData = {
  domain: '',
  yourData: {},
  competitorData: {},
  uploadedFiles: []
};

// Phase A: Data Discovery Endpoint - Just show raw file structure
app.post('/api/discover-data', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`\n=== PHASE A DATA DISCOVERY ===`);
    console.log(`File: ${file.originalname}`);
    console.log(`Size: ${file.size} bytes`);
    console.log(`Type: ${file.mimetype}`);

    let result = {
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      isCSV: file.originalname.toLowerCase().endsWith('.csv'),
      isPDF: file.originalname.toLowerCase().endsWith('.pdf')
    };

    if (file.originalname.toLowerCase().endsWith('.csv')) {
      // Parse CSV and show structure
      const parsedData = parseCSV(file.buffer);
      console.log(`Parsed ${parsedData.length} rows`);
      
      if (parsedData.length > 0) {
        console.log('Column names:', Object.keys(parsedData[0]));
        console.log('First row data:', parsedData[0]);
        
        result.totalRows = parsedData.length;
        result.columnNames = Object.keys(parsedData[0]);
        result.sampleRows = parsedData.slice(0, 5); // First 5 rows
        result.allColumns = result.columnNames.map(col => ({
          name: col,
          sampleValues: parsedData.slice(0, 5).map(row => row[col]).filter(val => val !== undefined && val !== '')
        }));
      } else {
        result.error = 'No data found in CSV file';
      }
    } else if (file.originalname.toLowerCase().endsWith('.pdf')) {
      result.message = 'PDF detected - content parsing not implemented yet';
      result.base64Preview = file.buffer.toString('base64').substring(0, 100) + '...';
    } else {
      result.error = 'Unsupported file type. Please upload CSV or PDF files.';
    }

    console.log('Discovery result:', {
      columns: result.columnNames?.length || 0,
      rows: result.totalRows || 0,
      fileType: result.isCSV ? 'CSV' : result.isPDF ? 'PDF' : 'Unknown'
    });

    res.json(result);
  } catch (error) {
    console.error('Data discovery error:', error);
    res.status(500).json({ 
      error: 'Failed to process file: ' + error.message,
      details: error.stack
    });
  }
});

// File upload endpoint
app.post('/api/upload-semrush', upload.single('file'), async (req, res) => {
  try {
    const { domain, isCompetitor } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Set domain
    analysisData.domain = domain;

    // Parse CSV file
    let parsedData = null;
    if (file.originalname.toLowerCase().endsWith('.csv')) {
      parsedData = parseCSV(file.buffer);
      console.log(`Parsed ${file.originalname}: ${parsedData.length} rows`);
      if (parsedData.length > 0) {
        console.log('First row columns:', Object.keys(parsedData[0]));
      }
    } else {
      // For PDFs, just store metadata for now
      parsedData = { type: 'pdf', filename: file.originalname, size: file.buffer.length };
    }

    // Determine report type from filename
    const reportType = detectReportType(file.originalname);
    console.log(`Detected report type: ${reportType} for ${file.originalname}`);
    
    // Store data
    const targetStorage = isCompetitor === 'true' ? analysisData.competitorData : analysisData.yourData;
    targetStorage[reportType] = parsedData;
    
    analysisData.uploadedFiles.push({
      filename: file.originalname,
      reportType,
      isCompetitor: isCompetitor === 'true',
      rowCount: Array.isArray(parsedData) ? parsedData.length : 1
    });

    console.log(`Stored in ${isCompetitor === 'true' ? 'competitor' : 'your'} data:`, reportType);

    res.json({
      message: 'File uploaded successfully',
      reportType,
      isCompetitor: isCompetitor === 'true',
      rowCount: Array.isArray(parsedData) ? parsedData.length : 1
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Phase B: NEW competitive analysis using REAL column structures from Phase A discovery
app.post('/api/analyze-competition-real', upload.array('files'), async (req, res) => {
  try {
    console.log('\n=== PHASE B REAL COMPETITIVE ANALYSIS ===');
    
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let keywordGapData = null;
    let backlinkGapData = null;
    let backlinkData = null;

    // Parse all uploaded files and identify types
    for (const file of files) {
      if (file.originalname.toLowerCase().endsWith('.csv')) {
        const parsedData = parseCSV(file.buffer);
        console.log(`Parsed ${file.originalname}: ${parsedData.length} rows`);
        
        if (file.originalname.toLowerCase().includes('keyword') && file.originalname.toLowerCase().includes('gap')) {
          keywordGapData = parsedData;
          console.log('Found keyword gap data');
        } else if (file.originalname.toLowerCase().includes('backlink') && file.originalname.toLowerCase().includes('gap')) {
          backlinkGapData = parsedData;
          console.log('Found backlink gap data');
        } else if (file.originalname.toLowerCase().includes('backlink')) {
          backlinkData = parsedData;
          console.log('Found backlink data');
        }
      }
    }

    const analysis = performRealCompetitiveAnalysis(keywordGapData, backlinkGapData, backlinkData);
    res.json(analysis);

  } catch (error) {
    console.error('Real analysis error:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// NEW: Real competitive analysis using actual SEMRush column structures
function performRealCompetitiveAnalysis(keywordGapData, backlinkGapData, backlinkData) {
  const actionPlan = [];
  const insights = {
    keywordGaps: 0,
    backlinkGaps: 0,
    competitiveScore: 50
  };

  console.log('Starting real competitive analysis...');

  // Analyze Keyword Gaps using REAL column names
  if (keywordGapData && keywordGapData.length > 0) {
    console.log('Analyzing keyword gaps with real data...');
    const keywordAnalysis = analyzeRealKeywordGaps(keywordGapData);
    actionPlan.push(...keywordAnalysis.actions);
    insights.keywordGaps = keywordAnalysis.gapCount;
  }

  // Analyze Backlink Gaps using REAL column names  
  if (backlinkGapData && backlinkGapData.length > 0) {
    console.log('Analyzing backlink gaps with real data...');
    const backlinkAnalysis = analyzeRealBacklinkGaps(backlinkGapData);
    actionPlan.push(...backlinkAnalysis.actions);
    insights.backlinkGaps = backlinkAnalysis.gapCount;
  }

  // Calculate competitive score based on gaps found
  insights.competitiveScore = calculateRealCompetitiveScore(insights.keywordGaps, insights.backlinkGaps);

  // Sort actions by priority
  actionPlan.sort((a, b) => {
    const priorityOrder = { critical: 3, high: 2, medium: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return {
    actionPlan: actionPlan.slice(0, 15), // Top 15 actions
    insights,
    summary: `Found ${actionPlan.length} real optimization opportunities using actual SEMRush data structures`
  };
}

// NEW: Analyze keyword gaps using REAL column names from Phase A discovery
function analyzeRealKeywordGaps(keywordGapData) {
  const actions = [];
  let gapCount = 0;

  console.log('=== REAL KEYWORD GAP ANALYSIS ===');
  console.log('Sample columns:', Object.keys(keywordGapData[0]));

  // Find your domain and competitor domain columns (they'll be actual domain names)
  const columns = Object.keys(keywordGapData[0]);
  let yourDomainCol = null;
  let competitorDomainCol = null;

  // Look for domain columns (should be like "servicecore.com" and "tank-track.com")
  for (const col of columns) {
    if (col.includes('.com') || col.includes('.net') || col.includes('.org')) {
      if (!yourDomainCol && (col.includes('servicecore') || col.includes('your'))) {
        yourDomainCol = col;
      } else if (!competitorDomainCol) {
        competitorDomainCol = col;
      }
    }
  }

  console.log(`Your domain column: ${yourDomainCol}`);
  console.log(`Competitor domain column: ${competitorDomainCol}`);

  if (!yourDomainCol || !competitorDomainCol) {
    console.log('Could not identify domain columns');
    return { actions, gapCount };
  }

  // Analyze each keyword for gaps
  keywordGapData.forEach((row, index) => {
    const keyword = row['Keyword'] || row['keyword'] || '';
    const yourPosition = parseInt(row[yourDomainCol]) || 999;
    const competitorPosition = parseInt(row[competitorDomainCol]) || 999;
    const volume = parseInt(row['Volume'] || row['Search Volume'] || row['volume']) || 0;
    const difficulty = parseInt(row['Keyword Difficulty'] || row['difficulty']) || 0;
    const cpc = parseFloat(row['CPC'] || row['cpc']) || 0;

    if (index < 3) {
      console.log(`Row ${index}: ${keyword} - You: ${yourPosition}, Competitor: ${competitorPosition}, Volume: ${volume}`);
    }

    // Find gaps where competitor beats you
    if (keyword && competitorPosition < yourPosition && volume > 50) {
      gapCount++;
      
      const positionGap = yourPosition - competitorPosition;
      let priority = 'medium';
      
      if (volume > 500 && positionGap > 5) priority = 'critical';
      else if (volume > 200 && positionGap > 3) priority = 'high';

      actions.push({
        priority,
        title: `Improve ranking for "${keyword}"`,
        description: `Competitor ranks #${competitorPosition}, you rank #${yourPosition}. ${volume.toLocaleString()} monthly searches.`,
        reason: `${positionGap} position gap costs you traffic. CPC: $${cpc}, Difficulty: ${difficulty}`,
        keyword,
        yourPosition,
        competitorPosition,
        volume,
        gap: positionGap
      });
    }
  });

  console.log(`Found ${gapCount} keyword gaps, created ${actions.length} actions`);
  return { actions, gapCount };
}

// NEW: Analyze backlink gaps using REAL column names from Phase A discovery  
function analyzeRealBacklinkGaps(backlinkGapData) {
  const actions = [];
  let gapCount = 0;

  console.log('=== REAL BACKLINK GAP ANALYSIS ===');
  console.log('Sample columns:', Object.keys(backlinkGapData[0]));

  // Find your domain and competitor domain columns (actual URLs/domains)
  const columns = Object.keys(backlinkGapData[0]);
  let yourDomainCol = null;
  let competitorDomainCol = null;

  // Look for domain columns 
  for (const col of columns) {
    if (col.includes('servicecore') || col.includes('https://')) {
      yourDomainCol = col;
    } else if (col.includes('.com') || col.includes('.net')) {
      competitorDomainCol = col;
    }
  }

  console.log(`Your domain column: ${yourDomainCol}`);
  console.log(`Competitor domain column: ${competitorDomainCol}`);

  if (!yourDomainCol || !competitorDomainCol) {
    console.log('Could not identify domain columns');
    return { actions, gapCount };
  }

  // Analyze each domain for backlink gaps
  backlinkGapData.forEach((row, index) => {
    const domain = row['Domain'] || row['domain'] || '';
    const yourBacklinks = parseInt(row[yourDomainCol]) || 0;
    const competitorBacklinks = parseInt(row[competitorDomainCol]) || 0;
    const domainAuthority = parseInt(row['Domain ascore'] || row['DA'] || row['authority']) || 0;

    if (index < 3) {
      console.log(`Row ${index}: ${domain} - You: ${yourBacklinks}, Competitor: ${competitorBacklinks}, DA: ${domainAuthority}`);
    }

    // Find gaps where competitor has backlinks and you don't
    if (domain && yourBacklinks === 0 && competitorBacklinks > 0 && domainAuthority > 20) {
      gapCount++;
      
      let priority = 'medium';
      if (domainAuthority > 70) priority = 'critical';
      else if (domainAuthority > 50) priority = 'high';

      actions.push({
        priority,
        title: `Get backlink from ${domain}`,
        description: `Competitor has ${competitorBacklinks} backlink(s), you have 0. Domain Authority: ${domainAuthority}`,
        reason: `High-authority domain linking to competitor but not you. Link building opportunity.`,
        domain,
        competitorBacklinks,
        domainAuthority
      });
    }
  });

  console.log(`Found ${gapCount} backlink gaps, created ${actions.length} actions`);
  return { actions, gapCount };
}

// NEW: Calculate competitive score based on real gaps found
function calculateRealCompetitiveScore(keywordGaps, backlinkGaps) {
  let score = 50; // Start neutral
  
  // Keyword gaps impact (more gaps = lower score)
  if (keywordGaps > 10) score -= 20;
  else if (keywordGaps > 5) score -= 10;
  else if (keywordGaps < 3) score += 10;
  
  // Backlink gaps impact
  if (backlinkGaps > 50) score -= 15;
  else if (backlinkGaps > 20) score -= 10;
  else if (backlinkGaps < 10) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

// Helper function to parse CSV
function parseCSV(buffer) {
  try {
    const csvString = buffer.toString('utf8');
    const lines = csvString.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
    
    return data;
  } catch (error) {
    console.error('CSV parsing error:', error);
    return [];
  }
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// Detect report type from filename
function detectReportType(filename) {
  const name = filename.toLowerCase();
  if (name.includes('domain') || name.includes('overview')) return 'domain_overview';
  if (name.includes('keyword') && name.includes('gap')) return 'keyword_gap';
  if (name.includes('backlink') && name.includes('gap')) return 'backlink_gap';
  if (name.includes('organic')) return 'organic_research';
  return 'unknown';
}

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Competitive Analysis Server running on port ${PORT}`);
});
