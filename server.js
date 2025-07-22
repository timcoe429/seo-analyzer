const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// SEO Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, targetKeyword } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Basic SEO Analysis
    const analysis = {
      url: url,
      title: $('title').text() || 'No title found',
      metaDescription: $('meta[name="description"]').attr('content') || '',
      headings: {
        h1: { count: $('h1').length, tags: $('h1').map((i, el) => $(el).text().trim()).get() },
        h2: { count: $('h2').length, tags: $('h2').map((i, el) => $(el).text().trim()).get() },
        h3: { count: $('h3').length, tags: $('h3').map((i, el) => $(el).text().trim()).get() },
        h4: { count: $('h4').length, tags: $('h4').map((i, el) => $(el).text().trim()).get() },
        h5: { count: $('h5').length, tags: $('h5').map((i, el) => $(el).text().trim()).get() },
        h6: { count: $('h6').length, tags: $('h6').map((i, el) => $(el).text().trim()).get() }
      },
      contentLength: $('body').text().replace(/\s+/g, ' ').split(' ').length,
      internalLinks: $('a[href^="/"], a[href*="' + new URL(url).hostname + '"]').length,
      externalLinks: $('a[href^="http"]').not('a[href*="' + new URL(url).hostname + '"]').length,
      images: {
        total: $('img').length,
        withAlt: $('img[alt]').length,
        withoutAlt: $('img').not('[alt]').length
      },
      schema: []
    };

    // Check for schema markup
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const schemaData = JSON.parse($(el).html());
        if (schemaData['@type']) {
          analysis.schema.push(schemaData['@type']);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Keyword analysis if provided
    if (targetKeyword) {
      const keyword = targetKeyword.toLowerCase();
      const title = analysis.title.toLowerCase();
      const metaDesc = analysis.metaDescription.toLowerCase();
      const h1Text = analysis.headings.h1.tags.join(' ').toLowerCase();
      const bodyText = $('body').text().toLowerCase();
      
      const keywordCount = (bodyText.match(new RegExp(keyword, 'g')) || []).length;
      const totalWords = analysis.contentLength;
      
      analysis.keywordAnalysis = {
        titleContainsKeyword: title.includes(keyword),
        h1ContainsKeyword: h1Text.includes(keyword),
        metaContainsKeyword: metaDesc.includes(keyword),
        density: totalWords > 0 ? ((keywordCount / totalWords) * 100).toFixed(2) : 0
      };
    }

    // Generate issues and recommendations
    const issues = [];
    const recommendations = [];

    // H1 issues
    if (analysis.headings.h1.count === 0) {
      issues.push({ type: 'error', category: 'Headings', message: 'No H1 tag found' });
      recommendations.push({ priority: 'high', action: 'Add exactly one H1 tag to your page' });
    } else if (analysis.headings.h1.count > 1) {
      issues.push({ type: 'error', category: 'Headings', message: `Found ${analysis.headings.h1.count} H1 tags` });
      recommendations.push({ priority: 'high', action: 'Use only one H1 tag per page' });
    } else {
      issues.push({ type: 'success', category: 'Headings', message: 'H1 structure is correct' });
    }

    // Meta description
    if (!analysis.metaDescription) {
      issues.push({ type: 'error', category: 'Meta', message: 'Missing meta description' });
      recommendations.push({ priority: 'high', action: 'Add a compelling meta description (150-160 characters)' });
    } else if (analysis.metaDescription.length < 120) {
      issues.push({ type: 'warning', category: 'Meta', message: 'Meta description is too short' });
      recommendations.push({ priority: 'medium', action: 'Expand meta description to 150-160 characters' });
    } else if (analysis.metaDescription.length > 160) {
      issues.push({ type: 'warning', category: 'Meta', message: 'Meta description is too long' });
      recommendations.push({ priority: 'medium', action: 'Shorten meta description to 150-160 characters' });
    }

    // Images without alt text
    if (analysis.images.withoutAlt > 0) {
      issues.push({ type: 'warning', category: 'Images', message: `${analysis.images.withoutAlt} images missing alt text` });
      recommendations.push({ priority: 'medium', action: 'Add descriptive alt text to all images' });
    }

    // Content length
    if (analysis.contentLength < 300) {
      issues.push({ type: 'warning', category: 'Content', message: 'Content is quite short' });
      recommendations.push({ priority: 'medium', action: 'Consider adding more valuable content (aim for 300+ words)' });
    }

    // Schema markup
    if (analysis.schema.length === 0) {
      issues.push({ type: 'warning', category: 'Schema', message: 'No structured data found' });
      recommendations.push({ priority: 'low', action: 'Add relevant schema markup for better search visibility' });
    }

    // Keyword optimization
    if (targetKeyword && analysis.keywordAnalysis) {
      if (!analysis.keywordAnalysis.titleContainsKeyword) {
        recommendations.push({ priority: 'high', action: `Include your target keyword "${targetKeyword}" in the title tag` });
      }
      if (!analysis.keywordAnalysis.h1ContainsKeyword) {
        recommendations.push({ priority: 'high', action: `Include your target keyword "${targetKeyword}" in the H1 tag` });
      }
      if (analysis.keywordAnalysis.density < 0.5) {
        recommendations.push({ priority: 'medium', action: `Increase keyword density (currently ${analysis.keywordAnalysis.density}%)` });
      } else if (analysis.keywordAnalysis.density > 3) {
        recommendations.push({ priority: 'medium', action: `Reduce keyword density to avoid over-optimization (currently ${analysis.keywordAnalysis.density}%)` });
      }
    }

    analysis.issues = issues;
    analysis.recommendations = recommendations;

    res.json(analysis);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze URL. Please check the URL and try again.' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
