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
    } else {
      // For PDFs, just store metadata for now
      parsedData = { type: 'pdf', filename: file.originalname, size: file.buffer.length };
    }

    // Determine report type from filename
    const reportType = detectReportType(file.originalname);
    
    // Store data
    const targetStorage = isCompetitor === 'true' ? analysisData.competitorData : analysisData.yourData;
    targetStorage[reportType] = parsedData;
    
    analysisData.uploadedFiles.push({
      filename: file.originalname,
      reportType,
      isCompetitor: isCompetitor === 'true',
      rowCount: Array.isArray(parsedData) ? parsedData.length : 1
    });

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

// Competitive analysis endpoint
app.post('/api/analyze-competition', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!analysisData.yourData || !analysisData.competitorData) {
      return res.status(400).json({ error: 'Missing data - please upload both your files and competitor files' });
    }

    // Perform competitive analysis
    const analysis = performCompetitiveAnalysis(analysisData.yourData, analysisData.competitorData, domain);
    
    res.json(analysis);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

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

// Main competitive analysis function
function performCompetitiveAnalysis(yourData, competitorData, domain) {
  const actionPlan = [];
  const insights = {
    keywordGaps: 0,
    backlinkGaps: 0,
    competitiveScore: 50
  };

  // Analyze Keyword Gaps
  if (yourData.keyword_gap && competitorData.keyword_gap) {
    const keywordAnalysis = analyzeKeywordGaps(yourData.keyword_gap, competitorData.keyword_gap);
    actionPlan.push(...keywordAnalysis.actions);
    insights.keywordGaps = keywordAnalysis.gapCount;
  }

  // Analyze Domain Overview
  if (yourData.domain_overview && competitorData.domain_overview) {
    const domainAnalysis = analyzeDomainGaps(yourData.domain_overview, competitorData.domain_overview);
    actionPlan.push(...domainAnalysis.actions);
  }

  // Analyze Backlink Gaps
  if (yourData.backlink_gap && competitorData.backlink_gap) {
    const backlinkAnalysis = analyzeBacklinkGaps(yourData.backlink_gap, competitorData.backlink_gap);
    actionPlan.push(...backlinkAnalysis.actions);
    insights.backlinkGaps = backlinkAnalysis.gapCount;
  }

  // Analyze Organic Research
  if (yourData.organic_research && competitorData.organic_research) {
    const organicAnalysis = analyzeOrganicGaps(yourData.organic_research, competitorData.organic_research);
    actionPlan.push(...organicAnalysis.actions);
  }

  // Calculate competitive score
  insights.competitiveScore = calculateCompetitiveScore(actionPlan);

  // Sort actions by priority
  actionPlan.sort((a, b) => {
    const priorityOrder = { critical: 3, high: 2, medium: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return {
    actionPlan: actionPlan.slice(0, 10), // Top 10 actions
    insights,
    summary: `Found ${actionPlan.length} optimization opportunities to beat your competition`
  };
}

// Analyze keyword gaps
function analyzeKeywordGaps(yourKeywords, competitorKeywords) {
  const actions = [];
  let gapCount = 0;

  if (!Array.isArray(yourKeywords) || !Array.isArray(competitorKeywords)) {
    return { actions, gapCount };
  }

  // Find keywords competitor ranks for that you don't
  const yourKeywordSet = new Set(yourKeywords.map(k => k.Keyword?.toLowerCase() || k.keyword?.toLowerCase() || ''));
  
  competitorKeywords.forEach(compKeyword => {
    const keyword = compKeyword.Keyword || compKeyword.keyword || '';
    const position = parseInt(compKeyword.Position) || parseInt(compKeyword.position) || 100;
    const volume = parseInt(compKeyword['Search Volume']) || parseInt(compKeyword.volume) || 0;
    
    if (keyword && position <= 20 && volume > 100 && !yourKeywordSet.has(keyword.toLowerCase())) {
      gapCount++;
      
      if (gapCount <= 5) { // Limit to top 5 gaps
        actions.push({
          priority: position <= 5 ? 'critical' : position <= 10 ? 'high' : 'medium',
          title: `Target keyword: "${keyword}"`,
          description: `Competitor ranks #${position} for this ${volume} search/month keyword`,
          reason: `They're getting traffic you're missing. High-value keyword opportunity.`
        });
      }
    }
  });

  return { actions, gapCount };
}

// Analyze domain authority gaps
function analyzeDomainGaps(yourDomain, competitorDomain) {
  const actions = [];

  if (!Array.isArray(yourDomain) || !Array.isArray(competitorDomain)) {
    return { actions };
  }

  const yourStats = yourDomain[0] || {};
  const compStats = competitorDomain[0] || {};

  const yourAuthority = parseInt(yourStats['Authority Score']) || parseInt(yourStats.authority) || 0;
  const compAuthority = parseInt(compStats['Authority Score']) || parseInt(compStats.authority) || 0;

  const yourBacklinks = parseInt(yourStats.Backlinks) || parseInt(yourStats.backlinks) || 0;
  const compBacklinks = parseInt(compStats.Backlinks) || parseInt(compStats.backlinks) || 0;

  if (compAuthority > yourAuthority + 10) {
    actions.push({
      priority: 'high',
      title: 'Improve Domain Authority',
      description: `Competitor has ${compAuthority} authority vs your ${yourAuthority}`,
      reason: 'Higher domain authority = better rankings. Focus on quality backlinks.'
    });
  }

  if (compBacklinks > yourBacklinks * 2) {
    actions.push({
      priority: 'critical',
      title: 'Aggressive Link Building Required',
      description: `Competitor has ${compBacklinks.toLocaleString()} backlinks vs your ${yourBacklinks.toLocaleString()}`,
      reason: 'Massive backlink gap. You need a serious link building campaign.'
    });
  }

  return { actions };
}

// Analyze backlink gaps
function analyzeBacklinkGaps(yourBacklinks, competitorBacklinks) {
  const actions = [];
  let gapCount = 0;

  if (!Array.isArray(yourBacklinks) || !Array.isArray(competitorBacklinks)) {
    return { actions, gapCount };
  }

  // Find high-authority domains linking to competitors but not you
  const yourDomains = new Set(yourBacklinks.map(b => b['Referring Domain'] || b.domain || ''));
  
  competitorBacklinks.forEach(compBacklink => {
    const domain = compBacklink['Referring Domain'] || compBacklink.domain || '';
    const authority = parseInt(compBacklink['Authority Score']) || parseInt(compBacklink.authority) || 0;
    
    if (domain && authority > 30 && !yourDomains.has(domain)) {
      gapCount++;
      
      if (gapCount <= 10) {
        actions.push({
          priority: authority > 70 ? 'critical' : authority > 50 ? 'high' : 'medium',
          title: `Get backlink from ${domain}`,
          description: `High authority site (${authority}) linking to competitor`,
          reason: 'They link to your competitor, they could link to you too.'
        });
      }
    }
  });

  return { actions, gapCount };
}

// Analyze organic research gaps
function analyzeOrganicGaps(yourOrganic, competitorOrganic) {
  const actions = [];

  if (!Array.isArray(yourOrganic) || !Array.isArray(competitorOrganic)) {
    return { actions };
  }

  // Find high-traffic pages competitors have that you don't
  const yourUrls = new Set(yourOrganic.map(p => (p.URL || p.url || '').toLowerCase()));
  
  competitorOrganic.slice(0, 10).forEach(compPage => {
    const url = compPage.URL || compPage.url || '';
    const traffic = parseInt(compPage.Traffic) || parseInt(compPage.traffic) || 0;
    const keywords = parseInt(compPage.Keywords) || parseInt(compPage.keywords) || 0;
    
    if (traffic > 1000 && keywords > 50) {
      const pageType = getPageType(url);
      
      actions.push({
        priority: traffic > 10000 ? 'critical' : 'high',
        title: `Create ${pageType} content`,
        description: `Competitor's ${pageType} gets ${traffic.toLocaleString()} monthly traffic`,
        reason: `They rank for ${keywords} keywords with this content type. Opportunity for you.`
      });
    }
  });

  return { actions };
}

function getPageType(url) {
  const path = url.toLowerCase();
  if (path.includes('/blog/')) return 'blog post';
  if (path.includes('/product/')) return 'product page';
  if (path.includes('/service/')) return 'service page';
  if (path.includes('/guide/')) return 'guide';
  if (path.includes('/tool/')) return 'tool page';
  return 'landing page';
}

function calculateCompetitiveScore(actions) {
  const criticalCount = actions.filter(a => a.priority === 'critical').length;
  const highCount = actions.filter(a => a.priority === 'high').length;
  
  let score = 85;
  score -= (criticalCount * 15);
  score -= (highCount * 8);
  
  return Math.max(10, Math.min(100, score));
}

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Competitive Analysis Server running on port ${PORT}`);
});
