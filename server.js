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
    const { url, targetKeyword, competitorUrl, isPillarPost } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Function to analyze a single page
    const analyzePage = async (pageUrl) => {
      const response = await axios.get(pageUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      return performSEOAnalysis($, pageUrl, targetKeyword, isPillarPost);
    };

    // Analyze main page
    const mainAnalysis = await analyzePage(url);
    
    // Analyze competitor if provided
    let competitorAnalysis = null;
    let comparison = null;
    
    if (competitorUrl) {
      try {
        competitorAnalysis = await analyzePage(competitorUrl);
        comparison = generateComparison(mainAnalysis, competitorAnalysis, targetKeyword, isPillarPost);
      } catch (error) {
        console.error('Competitor analysis failed:', error);
        // Continue with main analysis even if competitor fails
      }
    }

    // Generate AI-ready report
    const aiReport = generateAIReport(mainAnalysis, competitorAnalysis, comparison, targetKeyword, isPillarPost);

    const result = {
      analysis: mainAnalysis,
      competitor: competitorAnalysis,
      comparison: comparison,
      aiReport: aiReport
    };

    res.json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze URL. Please check the URL and try again.' });
  }
});

// Function to perform comprehensive SEO analysis
function performSEOAnalysis($, url, targetKeyword, isPillarPost = false) {
  // Comprehensive SEO Analysis
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  
  const analysis = {
    url: url,
    domain: domain,
    title: $('title').text() || 'No title found',
    titleLength: ($('title').text() || '').length,
    metaDescription: $('meta[name="description"]').attr('content') || '',
    metaDescriptionLength: ($('meta[name="description"]').attr('content') || '').length,
    
    // Enhanced heading analysis
    headings: {
      h1: { count: $('h1').length, tags: $('h1').map((i, el) => $(el).text().trim()).get() },
      h2: { count: $('h2').length, tags: $('h2').map((i, el) => $(el).text().trim()).get() },
      h3: { count: $('h3').length, tags: $('h3').map((i, el) => $(el).text().trim()).get() },
      h4: { count: $('h4').length, tags: $('h4').map((i, el) => $(el).text().trim()).get() },
      h5: { count: $('h5').length, tags: $('h5').map((i, el) => $(el).text().trim()).get() },
      h6: { count: $('h6').length, tags: $('h6').map((i, el) => $(el).text().trim()).get() }
    },
    
    // Content analysis
    contentLength: $('body').text().replace(/\s+/g, ' ').split(' ').length,
    readabilityScore: calculateReadabilityScore($('body').text()),
    
    // Link analysis
    internalLinks: $('a[href^="/"], a[href*="' + domain + '"]').length,
    externalLinks: $('a[href^="http"]').not('a[href*="' + domain + '"]').length,
    
    // Enhanced image analysis
    images: {
      total: $('img').length,
      withAlt: $('img[alt]').length,
      withoutAlt: $('img').not('[alt]').length,
      withTitle: $('img[title]').length,
      optimized: $('img[loading="lazy"]').length,
      sizes: $('img').map((i, el) => {
        const $img = $(el);
        return {
          src: $img.attr('src'),
          alt: $img.attr('alt') || '',
          width: $img.attr('width'),
          height: $img.attr('height'),
          hasLazyLoading: $img.attr('loading') === 'lazy'
        };
      }).get()
    },
    
    // Technical SEO
    technical: {
      favicon: $('link[rel*="icon"]').length > 0,
      viewport: $('meta[name="viewport"]').length > 0,
      charset: $('meta[charset]').length > 0,
      canonical: $('link[rel="canonical"]').attr('href') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      openGraph: {
        title: $('meta[property="og:title"]').attr('content') || '',
        description: $('meta[property="og:description"]').attr('content') || '',
        image: $('meta[property="og:image"]').attr('content') || '',
        url: $('meta[property="og:url"]').attr('content') || '',
        type: $('meta[property="og:type"]').attr('content') || ''
      },
      twitterCard: {
        card: $('meta[name="twitter:card"]').attr('content') || '',
        title: $('meta[name="twitter:title"]').attr('content') || '',
        description: $('meta[name="twitter:description"]').attr('content') || '',
        image: $('meta[name="twitter:image"]').attr('content') || ''
      }
    },
    
    // Performance indicators
    performance: {
      totalElements: $('*').length,
      totalScripts: $('script').length,
      totalStylesheets: $('link[rel="stylesheet"]').length,
      inlineStyles: $('[style]').length
    },
    
    // Pillar post specific
    isPillarPost: isPillarPost,
    
    schema: {}
  };

  // Function to calculate basic readability score (Flesch Reading Ease approximation)
  function calculateReadabilityScore(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(w => w.trim().length > 0).length;
    const syllables = text.toLowerCase().split(/[aeiou]+/).length - 1;
    
    if (sentences === 0 || words === 0) return 0;
    
    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Enhanced Schema Markup Analysis
  const schemaTypes = [];
  const schemaData = [];
  
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const schema = JSON.parse($(el).html());
      schemaData.push(schema);
      
      if (schema['@type']) {
        schemaTypes.push(schema['@type']);
      } else if (Array.isArray(schema)) {
        schema.forEach(item => {
          if (item['@type']) schemaTypes.push(item['@type']);
        });
      }
    } catch (e) {
      // Skip invalid JSON
    }
  });
  
  analysis.schema = {
    types: schemaTypes,
    data: schemaData,
    hasOrganization: schemaTypes.includes('Organization'),
    hasWebsite: schemaTypes.includes('WebSite'),
    hasWebPage: schemaTypes.includes('WebPage'),
    hasBreadcrumb: schemaTypes.includes('BreadcrumbList'),
    hasLocalBusiness: schemaTypes.includes('LocalBusiness'),
    hasProduct: schemaTypes.includes('Product'),
    hasArticle: schemaTypes.includes('Article'),
    hasFAQ: schemaTypes.includes('FAQPage'),
    hasReview: schemaTypes.includes('Review') || schemaTypes.includes('AggregateRating')
  };

  // Keyword analysis if provided
  if (targetKeyword) {
    const keyword = targetKeyword.toLowerCase().trim();
    const title = analysis.title.toLowerCase();
    const metaDesc = analysis.metaDescription.toLowerCase();
    const h1Text = analysis.headings.h1.tags.join(' ').toLowerCase();
    const bodyText = $('body').text().toLowerCase();
    
    // Helper function to check if keywords match (allows partial matches)
    const keywordMatches = (text, targetKeyword) => {
      // Split target keyword into individual words
      const keywordWords = targetKeyword.split(/\s+/).filter(word => word.length > 2); // Ignore short words like "a", "the", etc.
      
      // Check if all keyword words are present in the text
      const allWordsPresent = keywordWords.every(word => text.includes(word));
      
      // Also check for exact phrase match
      const exactMatch = text.includes(targetKeyword);
      
      return {
        exactMatch,
        partialMatch: allWordsPresent,
        matchedWords: keywordWords.filter(word => text.includes(word)),
        totalWords: keywordWords.length
      };
    };
    
    // Analyze keyword presence in different sections
    const titleMatch = keywordMatches(title, keyword);
    const h1Match = keywordMatches(h1Text, keyword);
    const metaMatch = keywordMatches(metaDesc, keyword);
    
    // Count keyword occurrences (both exact and partial)
    const exactKeywordCount = (bodyText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const keywordWords = keyword.split(/\s+/).filter(word => word.length > 2);
    const partialKeywordCount = keywordWords.reduce((count, word) => {
      const wordMatches = (bodyText.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      return count + wordMatches;
    }, 0);
    
    const totalWords = analysis.contentLength;
    
    analysis.keywordAnalysis = {
      targetKeyword: targetKeyword,
      titleContainsKeyword: titleMatch.exactMatch || titleMatch.partialMatch,
      titleMatch: titleMatch,
      h1ContainsKeyword: h1Match.exactMatch || h1Match.partialMatch,
      h1Match: h1Match,
      metaContainsKeyword: metaMatch.exactMatch || metaMatch.partialMatch,
      metaMatch: metaMatch,
      exactDensity: totalWords > 0 ? ((exactKeywordCount / totalWords) * 100).toFixed(2) : 0,
      partialDensity: totalWords > 0 ? ((partialKeywordCount / totalWords) * 100).toFixed(2) : 0,
      keywordWords: keywordWords,
      exactMatches: exactKeywordCount,
      partialMatches: partialKeywordCount
    };
  }

  // Comprehensive SEO Analysis & Recommendations
  const issues = [];
  const recommendations = [];

  // === TITLE TAG ANALYSIS ===
  if (!analysis.title || analysis.title === 'No title found') {
    issues.push({ type: 'error', category: 'Title', message: 'Missing title tag' });
    recommendations.push({ priority: 'critical', action: 'Add a descriptive title tag (50-60 characters)' });
  } else if (analysis.titleLength < 30) {
    issues.push({ type: 'warning', category: 'Title', message: `Title is too short (${analysis.titleLength} chars)` });
    recommendations.push({ priority: 'high', action: 'Expand title to 50-60 characters for better visibility' });
  } else if (analysis.titleLength > 60) {
    issues.push({ type: 'warning', category: 'Title', message: `Title may be truncated (${analysis.titleLength} chars)` });
    recommendations.push({ priority: 'medium', action: 'Shorten title to under 60 characters' });
  } else {
    issues.push({ type: 'success', category: 'Title', message: `Title length is optimal (${analysis.titleLength} chars)` });
  }

  // === HEADING STRUCTURE ANALYSIS ===
  if (analysis.headings.h1.count === 0) {
    issues.push({ type: 'error', category: 'Headings', message: 'No H1 tag found' });
    recommendations.push({ priority: 'critical', action: 'Add exactly one H1 tag that describes the main topic' });
  } else if (analysis.headings.h1.count > 1) {
    issues.push({ type: 'error', category: 'Headings', message: `Multiple H1 tags found (${analysis.headings.h1.count})` });
    recommendations.push({ priority: 'high', action: 'Use only one H1 tag per page, convert others to H2-H6' });
  } else {
    issues.push({ type: 'success', category: 'Headings', message: 'H1 structure is correct' });
  }

  // Check heading hierarchy
  const headingCounts = [
    analysis.headings.h1.count, analysis.headings.h2.count, analysis.headings.h3.count,
    analysis.headings.h4.count, analysis.headings.h5.count, analysis.headings.h6.count
  ];
  
  for (let i = 0; i < headingCounts.length - 1; i++) {
    if (headingCounts[i] === 0 && headingCounts[i + 1] > 0) {
      const currentLevel = i + 1;
      const nextLevel = i + 2;
      issues.push({ 
        type: 'warning', 
        category: 'Headings', 
        message: `H${nextLevel} found without H${currentLevel} - breaks heading hierarchy` 
      });
      recommendations.push({ 
        priority: 'medium', 
        action: `Convert H${nextLevel} tags to H${currentLevel} or add H${currentLevel} tags to maintain proper hierarchy` 
      });
    }
  }

  // === META DESCRIPTION ANALYSIS ===
  if (!analysis.metaDescription) {
    issues.push({ type: 'error', category: 'Meta', message: 'Missing meta description' });
    recommendations.push({ priority: 'critical', action: 'Add a compelling meta description (150-160 characters)' });
  } else if (analysis.metaDescriptionLength < 120) {
    issues.push({ type: 'warning', category: 'Meta', message: `Meta description too short (${analysis.metaDescriptionLength} chars)` });
    recommendations.push({ priority: 'high', action: 'Expand meta description to 150-160 characters' });
  } else if (analysis.metaDescriptionLength > 160) {
    issues.push({ type: 'warning', category: 'Meta', message: `Meta description too long (${analysis.metaDescriptionLength} chars)` });
    recommendations.push({ priority: 'medium', action: 'Shorten meta description to 150-160 characters' });
  } else {
    issues.push({ type: 'success', category: 'Meta', message: `Meta description length is optimal (${analysis.metaDescriptionLength} chars)` });
  }

  // === TECHNICAL SEO ANALYSIS ===
  if (!analysis.technical.viewport) {
    issues.push({ type: 'error', category: 'Technical', message: 'Missing viewport meta tag' });
    recommendations.push({ priority: 'high', action: 'Add viewport meta tag for mobile optimization' });
  }

  if (!analysis.technical.charset) {
    issues.push({ type: 'warning', category: 'Technical', message: 'Missing charset declaration' });
    recommendations.push({ priority: 'medium', action: 'Add charset meta tag (UTF-8)' });
  }

  if (!analysis.technical.canonical) {
    issues.push({ type: 'warning', category: 'Technical', message: 'Missing canonical URL' });
    recommendations.push({ priority: 'medium', action: 'Add canonical link tag to prevent duplicate content issues' });
  }

  if (!analysis.technical.favicon) {
    issues.push({ type: 'warning', category: 'Technical', message: 'Missing favicon' });
    recommendations.push({ priority: 'low', action: 'Add favicon for better user experience' });
  }

  // === OPEN GRAPH ANALYSIS ===
  if (!analysis.technical.openGraph.title && !analysis.technical.openGraph.description) {
    issues.push({ type: 'warning', category: 'Social', message: 'Missing Open Graph tags' });
    recommendations.push({ priority: 'medium', action: 'Add Open Graph tags for better social media sharing' });
  }

  // === IMAGE OPTIMIZATION ANALYSIS ===
  if (analysis.images.withoutAlt > 0) {
    issues.push({ type: 'warning', category: 'Images', message: `${analysis.images.withoutAlt} images missing alt text` });
    recommendations.push({ priority: 'high', action: 'Add descriptive alt text to all images for accessibility and SEO' });
  }

  if (analysis.images.total > 0 && analysis.images.optimized === 0) {
    issues.push({ type: 'warning', category: 'Performance', message: 'No lazy loading detected on images' });
    recommendations.push({ priority: 'medium', action: 'Add loading="lazy" to images for better performance' });
  }

  // === CONTENT ANALYSIS ===
  const minWords = isPillarPost ? 2000 : 300;
  const idealWords = isPillarPost ? 3000 : 800;
  
  if (analysis.contentLength < minWords) {
    issues.push({ type: 'warning', category: 'Content', message: `Content is too short for ${isPillarPost ? 'pillar post' : 'regular content'} (${analysis.contentLength} words, need ${minWords}+)` });
    recommendations.push({ priority: isPillarPost ? 'critical' : 'medium', action: `Add more comprehensive content (aim for ${idealWords}+ words)` });
  } else if (analysis.contentLength > 5000 && !isPillarPost) {
    issues.push({ type: 'info', category: 'Content', message: `Very long content (${analysis.contentLength} words) - consider if this should be a pillar post` });
    recommendations.push({ priority: 'low', action: 'Consider breaking into multiple pages or marking as pillar post' });
  } else if (isPillarPost && analysis.contentLength > idealWords) {
    issues.push({ type: 'success', category: 'Content', message: `Good pillar post length (${analysis.contentLength} words)` });
  }

  // Readability analysis
  if (analysis.readabilityScore < 30) {
    issues.push({ type: 'warning', category: 'Content', message: 'Content is difficult to read' });
    recommendations.push({ priority: 'medium', action: 'Simplify sentences and use shorter paragraphs' });
  } else if (analysis.readabilityScore > 70) {
    issues.push({ type: 'success', category: 'Content', message: 'Content has good readability' });
  }

  // === SCHEMA MARKUP ANALYSIS ===
  if (analysis.schema.types.length === 0) {
    issues.push({ type: 'warning', category: 'Schema', message: 'No structured data found' });
    recommendations.push({ priority: 'medium', action: 'Add relevant schema markup (Organization, WebSite, WebPage)' });
  } else {
    issues.push({ type: 'success', category: 'Schema', message: `Found ${analysis.schema.types.length} schema type(s): ${analysis.schema.types.join(', ')}` });
  }

  // Schema recommendations based on missing types
  if (!analysis.schema.hasOrganization) {
    recommendations.push({ priority: 'medium', action: 'Add Organization schema for better business visibility' });
  }
  if (!analysis.schema.hasWebsite) {
    recommendations.push({ priority: 'medium', action: 'Add WebSite schema with siteNavigationElement' });
  }
  if (!analysis.schema.hasBreadcrumb && analysis.headings.h2.count > 0) {
    recommendations.push({ priority: 'low', action: 'Consider adding BreadcrumbList schema for navigation' });
  }

  // === PERFORMANCE INDICATORS ===
  if (analysis.performance.totalScripts > 10) {
    issues.push({ type: 'warning', category: 'Performance', message: `High number of scripts (${analysis.performance.totalScripts})` });
    recommendations.push({ priority: 'low', action: 'Consider combining or reducing JavaScript files' });
  }

  if (analysis.performance.inlineStyles > 20) {
    issues.push({ type: 'warning', category: 'Performance', message: `Many inline styles detected (${analysis.performance.inlineStyles})` });
    recommendations.push({ priority: 'low', action: 'Move inline styles to CSS files for better caching' });
  }

  // === PILLAR POST SPECIFIC ANALYSIS ===
  if (isPillarPost) {
    // Check for comprehensive H2 coverage
    if (analysis.headings.h2.count < 5) {
      issues.push({ type: 'warning', category: 'Pillar Post', message: `Only ${analysis.headings.h2.count} H2 sections - pillar posts need comprehensive topic coverage` });
      recommendations.push({ priority: 'high', action: 'Add more H2 sections to cover topic comprehensively (aim for 8-15 sections)' });
    }
    
    // Check internal linking for pillar posts
    if (analysis.internalLinks < 10) {
      issues.push({ type: 'warning', category: 'Pillar Post', message: `Low internal linking (${analysis.internalLinks}) - pillar posts should link to supporting content` });
      recommendations.push({ priority: 'high', action: 'Add more internal links to related content and cluster pages' });
    }
  }

  // Keyword optimization
  if (targetKeyword && analysis.keywordAnalysis) {
    const ka = analysis.keywordAnalysis;
    
    // Title optimization
    if (!ka.titleContainsKeyword) {
      if (ka.titleMatch.partialMatch) {
        recommendations.push({ 
          priority: 'medium', 
          action: `Consider including the exact phrase "${targetKeyword}" in title (currently has ${ka.titleMatch.matchedWords.length}/${ka.titleMatch.totalWords} words)` 
        });
      } else {
        recommendations.push({ 
          priority: 'high', 
          action: `Include your target keyword "${targetKeyword}" in the title tag` 
        });
      }
    } else {
      issues.push({ 
        type: 'success', 
        category: 'Keywords', 
        message: `Title contains target keyword "${targetKeyword}"${ka.titleMatch.exactMatch ? ' (exact match)' : ' (partial match)'}` 
      });
    }
    
    // H1 optimization
    if (!ka.h1ContainsKeyword) {
      if (ka.h1Match.partialMatch) {
        recommendations.push({ 
          priority: 'medium', 
          action: `Consider including the exact phrase "${targetKeyword}" in H1 (currently has ${ka.h1Match.matchedWords.length}/${ka.h1Match.totalWords} words)` 
        });
      } else {
        recommendations.push({ 
          priority: 'high', 
          action: `Include your target keyword "${targetKeyword}" in the H1 tag` 
        });
      }
    } else {
      issues.push({ 
        type: 'success', 
        category: 'Keywords', 
        message: `H1 contains target keyword "${targetKeyword}"${ka.h1Match.exactMatch ? ' (exact match)' : ' (partial match)'}` 
      });
    }
    
    // Meta description optimization
    if (!ka.metaContainsKeyword) {
      if (ka.metaMatch.partialMatch) {
        recommendations.push({ 
          priority: 'medium', 
          action: `Consider including the exact phrase "${targetKeyword}" in meta description (currently has ${ka.metaMatch.matchedWords.length}/${ka.metaMatch.totalWords} words)` 
        });
      } else {
        recommendations.push({ 
          priority: 'medium', 
          action: `Include your target keyword "${targetKeyword}" in the meta description` 
        });
      }
    }
    
    // Keyword density analysis
    const minDensity = isPillarPost ? 0.8 : 0.5;
    const maxDensity = isPillarPost ? 2.5 : 3;
    
    if (ka.exactDensity < minDensity && ka.partialDensity < (minDensity * 2)) {
      recommendations.push({ 
        priority: 'medium', 
        action: `Increase keyword presence (exact: ${ka.exactDensity}%, partial: ${ka.partialDensity}% - aim for ${minDensity}%+ exact)` 
      });
    } else if (ka.exactDensity > maxDensity) {
      recommendations.push({ 
        priority: 'medium', 
        action: `Reduce exact keyword density to avoid over-optimization (currently ${ka.exactDensity}% - aim for under ${maxDensity}%)` 
      });
    } else {
      issues.push({ 
        type: 'success', 
        category: 'Keywords', 
        message: `Good keyword density (exact: ${ka.exactDensity}%, partial: ${ka.partialDensity}%)` 
      });
    }
  }

  analysis.issues = issues;
  analysis.recommendations = recommendations;

  return analysis;
}

// Function to generate competitor comparison
function generateComparison(yourAnalysis, competitorAnalysis, targetKeyword, isPillarPost = false) {
  const gaps = [];
  const advantages = [];
  const criticalActions = [];

  // Content length comparison
  const contentGap = competitorAnalysis.contentLength - yourAnalysis.contentLength;
  if (contentGap > 500) {
    gaps.push({
      category: 'Content',
      issue: `Competitor has ${contentGap} more words (${competitorAnalysis.contentLength} vs ${yourAnalysis.contentLength})`,
      impact: 'high',
      action: `Add ${Math.ceil(contentGap / 100) * 100} more words of valuable content`
    });
    criticalActions.push({
      priority: 'critical',
      action: `Content gap: Add ${contentGap} words to match competitor depth`,
      category: 'Content'
    });
  } else if (contentGap < -200) {
    advantages.push({
      category: 'Content',
      advantage: `You have ${Math.abs(contentGap)} more words than competitor`,
      leverage: 'Continue providing comprehensive content'
    });
  }

  // Title comparison
  if (competitorAnalysis.titleLength >= 50 && competitorAnalysis.titleLength <= 60 && 
      (yourAnalysis.titleLength < 50 || yourAnalysis.titleLength > 60)) {
    gaps.push({
      category: 'Title',
      issue: `Competitor has better title length (${competitorAnalysis.titleLength} vs ${yourAnalysis.titleLength} chars)`,
      impact: 'medium',
      action: 'Optimize title length to 50-60 characters'
    });
  }

  // Meta description comparison
  if (competitorAnalysis.metaDescriptionLength >= 150 && competitorAnalysis.metaDescriptionLength <= 160 && 
      (yourAnalysis.metaDescriptionLength < 150 || yourAnalysis.metaDescriptionLength > 160)) {
    gaps.push({
      category: 'Meta',
      issue: `Competitor has better meta description length (${competitorAnalysis.metaDescriptionLength} vs ${yourAnalysis.metaDescriptionLength} chars)`,
      impact: 'medium',
      action: 'Optimize meta description to 150-160 characters'
    });
  }

  // H1 comparison
  if (competitorAnalysis.headings.h1.count === 1 && yourAnalysis.headings.h1.count !== 1) {
    gaps.push({
      category: 'Headings',
      issue: `Competitor has proper H1 structure (1 vs ${yourAnalysis.headings.h1.count})`,
      impact: 'high',
      action: 'Fix H1 structure to exactly one H1 tag'
    });
  }

  // Heading structure comparison
  const competitorTotalHeadings = Object.values(competitorAnalysis.headings).reduce((sum, h) => sum + h.count, 0);
  const yourTotalHeadings = Object.values(yourAnalysis.headings).reduce((sum, h) => sum + h.count, 0);
  
  if (competitorTotalHeadings > yourTotalHeadings + 3) {
    gaps.push({
      category: 'Content Structure',
      issue: `Competitor has better content structure (${competitorTotalHeadings} vs ${yourTotalHeadings} headings)`,
      impact: 'medium',
      action: 'Add more headings to break up content and improve structure'
    });
  }

  // Schema comparison
  const competitorSchemaCount = competitorAnalysis.schema.types.length;
  const yourSchemaCount = yourAnalysis.schema.types.length;
  
  if (competitorSchemaCount > yourSchemaCount) {
    const missingSchema = competitorAnalysis.schema.types.filter(type => 
      !yourAnalysis.schema.types.includes(type)
    );
    
    gaps.push({
      category: 'Schema',
      issue: `Competitor has ${competitorSchemaCount - yourSchemaCount} more schema types`,
      impact: 'medium',
      action: `Add missing schema: ${missingSchema.join(', ')}`
    });
    
    criticalActions.push({
      priority: 'high',
      action: `Schema gap: Add ${missingSchema.join(', ')} schema markup`,
      category: 'Technical'
    });
  }

  // Technical SEO comparison
  const competitorTechnicalScore = Object.values(competitorAnalysis.technical).filter(v => v === true || (typeof v === 'string' && v.length > 0)).length;
  const yourTechnicalScore = Object.values(yourAnalysis.technical).filter(v => v === true || (typeof v === 'string' && v.length > 0)).length;
  
  if (competitorTechnicalScore > yourTechnicalScore) {
    gaps.push({
      category: 'Technical',
      issue: `Competitor has better technical SEO implementation`,
      impact: 'medium',
      action: 'Review and implement missing technical SEO elements'
    });
  }

  // Image optimization comparison
  if (competitorAnalysis.images.total > 0) {
    const competitorAltRatio = competitorAnalysis.images.withAlt / competitorAnalysis.images.total;
    const yourAltRatio = yourAnalysis.images.total > 0 ? yourAnalysis.images.withAlt / yourAnalysis.images.total : 0;
    
    if (competitorAltRatio > yourAltRatio + 0.2) {
      gaps.push({
        category: 'Images',
        issue: `Competitor has better image optimization (${Math.round(competitorAltRatio * 100)}% vs ${Math.round(yourAltRatio * 100)}% with alt text)`,
        impact: 'medium',
        action: 'Add alt text to all images'
      });
    }
  }

  // Keyword analysis comparison (if available)
  if (targetKeyword && yourAnalysis.keywordAnalysis && competitorAnalysis.keywordAnalysis) {
    const yourKA = yourAnalysis.keywordAnalysis;
    const compKA = competitorAnalysis.keywordAnalysis;
    
    // Title keyword comparison
    if (compKA.titleContainsKeyword && !yourKA.titleContainsKeyword) {
      gaps.push({
        category: 'Keywords',
        issue: `Competitor includes target keyword in title, you don't`,
        impact: 'high',
        action: `Include "${targetKeyword}" in your title tag`
      });
      criticalActions.push({
        priority: 'critical',
        action: `Keyword gap: Add "${targetKeyword}" to title tag`,
        category: 'Keywords'
      });
    }
    
    // H1 keyword comparison
    if (compKA.h1ContainsKeyword && !yourKA.h1ContainsKeyword) {
      gaps.push({
        category: 'Keywords',
        issue: `Competitor includes target keyword in H1, you don't`,
        impact: 'high',
        action: `Include "${targetKeyword}" in your H1 tag`
      });
    }
    
    // Keyword density comparison
    if (parseFloat(compKA.exactDensity) > parseFloat(yourKA.exactDensity) + 0.5) {
      gaps.push({
        category: 'Keywords',
        issue: `Competitor has higher keyword density (${compKA.exactDensity}% vs ${yourKA.exactDensity}%)`,
        impact: 'medium',
        action: `Increase keyword usage naturally throughout content`
      });
    }
  }

  // Pillar post specific comparisons
  if (isPillarPost) {
    // Internal linking comparison
    if (competitorAnalysis.internalLinks > yourAnalysis.internalLinks + 5) {
      gaps.push({
        category: 'Internal Linking',
        issue: `Competitor has ${competitorAnalysis.internalLinks - yourAnalysis.internalLinks} more internal links`,
        impact: 'high',
        action: 'Add more internal links to related content and cluster pages'
      });
      criticalActions.push({
        priority: 'high',
        action: `Pillar post gap: Add ${competitorAnalysis.internalLinks - yourAnalysis.internalLinks} more internal links`,
        category: 'Internal Linking'
      });
    }
    
    // H2 coverage comparison
    const competitorH2Count = competitorAnalysis.headings.h2.count;
    const yourH2Count = yourAnalysis.headings.h2.count;
    
    if (competitorH2Count > yourH2Count + 2) {
      gaps.push({
        category: 'Topic Coverage',
        issue: `Competitor covers more topics (${competitorH2Count} vs ${yourH2Count} H2 sections)`,
        impact: 'high',
        action: `Add ${competitorH2Count - yourH2Count} more topic sections to improve comprehensiveness`
      });
    }
  }

  // Calculate overall competitive score
  const totalGaps = gaps.length;
  const highImpactGaps = gaps.filter(g => g.impact === 'high').length;
  const competitiveScore = Math.max(0, 100 - (totalGaps * 10) - (highImpactGaps * 15));

  return {
    score: competitiveScore,
    gaps: gaps,
    advantages: advantages,
    criticalActions: criticalActions,
    summary: {
      totalGaps: totalGaps,
      highImpactGaps: highImpactGaps,
      contentLengthDifference: contentGap,
      schemaGap: competitorSchemaCount - yourSchemaCount,
      recommendation: competitiveScore < 70 ? 
        'Significant improvements needed to outrank competitor' : 
        competitiveScore < 85 ? 
        'Some optimizations needed to secure ranking' : 
        'You\'re competitive - focus on content quality and user experience'
    }
     };
 }

// Function to generate AI-ready report for Claude/ChatGPT
function generateAIReport(yourAnalysis, competitorAnalysis = null, comparison = null, targetKeyword, isPillarPost = false) {
  const date = new Date().toLocaleDateString();
  
  let report = `# SEO Analysis Report - ${date}

## Page Information
- **URL**: ${yourAnalysis.url}
- **Target Keyword**: ${targetKeyword || 'Not specified'}
- **Content Type**: ${isPillarPost ? 'Pillar Post' : 'Regular Content'}
- **Analysis Date**: ${date}

## Current Page Performance

### Content Analysis
- **Word Count**: ${yourAnalysis.contentLength} words
- **Readability Score**: ${yourAnalysis.readabilityScore}/100
- **Title**: "${yourAnalysis.title}" (${yourAnalysis.titleLength} characters)
- **Meta Description**: "${yourAnalysis.metaDescription}" (${yourAnalysis.metaDescriptionLength} characters)

### Heading Structure
- **H1**: ${yourAnalysis.headings.h1.count} tag(s) - ${yourAnalysis.headings.h1.tags.join(', ')}
- **H2**: ${yourAnalysis.headings.h2.count} tag(s)
- **H3**: ${yourAnalysis.headings.h3.count} tag(s)
- **H4**: ${yourAnalysis.headings.h4.count} tag(s)
- **H5**: ${yourAnalysis.headings.h5.count} tag(s)
- **H6**: ${yourAnalysis.headings.h6.count} tag(s)

### Technical SEO Status
- **Viewport Meta**: ${yourAnalysis.technical.viewport ? '✅ Present' : '❌ Missing'}
- **Charset**: ${yourAnalysis.technical.charset ? '✅ Present' : '❌ Missing'}
- **Canonical URL**: ${yourAnalysis.technical.canonical ? '✅ Present' : '❌ Missing'}
- **Favicon**: ${yourAnalysis.technical.favicon ? '✅ Present' : '❌ Missing'}

### Schema Markup
- **Types Found**: ${yourAnalysis.schema.types.length > 0 ? yourAnalysis.schema.types.join(', ') : 'None'}
- **Organization Schema**: ${yourAnalysis.schema.hasOrganization ? '✅' : '❌'}
- **Website Schema**: ${yourAnalysis.schema.hasWebsite ? '✅' : '❌'}
- **Article Schema**: ${yourAnalysis.schema.hasArticle ? '✅' : '❌'}

### Images & Media
- **Total Images**: ${yourAnalysis.images.total}
- **Images with Alt Text**: ${yourAnalysis.images.withAlt}
- **Images Missing Alt Text**: ${yourAnalysis.images.withoutAlt}
- **Lazy Loading**: ${yourAnalysis.images.optimized} images optimized

### Link Analysis
- **Internal Links**: ${yourAnalysis.internalLinks}
- **External Links**: ${yourAnalysis.externalLinks}

`;

  // Add keyword analysis if available
  if (yourAnalysis.keywordAnalysis) {
    const ka = yourAnalysis.keywordAnalysis;
    report += `### Keyword Analysis for "${targetKeyword}"
- **Title Contains Keyword**: ${ka.titleContainsKeyword ? '✅ Yes' : '❌ No'} ${ka.titleMatch.exactMatch ? '(exact)' : ka.titleMatch.partialMatch ? '(partial)' : ''}
- **H1 Contains Keyword**: ${ka.h1ContainsKeyword ? '✅ Yes' : '❌ No'} ${ka.h1Match.exactMatch ? '(exact)' : ka.h1Match.partialMatch ? '(partial)' : ''}
- **Meta Contains Keyword**: ${ka.metaContainsKeyword ? '✅ Yes' : '❌ No'}
- **Exact Keyword Density**: ${ka.exactDensity}%
- **Partial Keyword Density**: ${ka.partialDensity}%

`;
  }

  // Add competitor analysis if available
  if (competitorAnalysis && comparison) {
    report += `## 🔥 COMPETITOR ANALYSIS

### Competitor Overview
- **URL**: ${competitorAnalysis.url}
- **Content Length**: ${competitorAnalysis.contentLength} words
- **Title Length**: ${competitorAnalysis.titleLength} characters
- **Meta Description Length**: ${competitorAnalysis.metaDescriptionLength} characters
- **Schema Types**: ${competitorAnalysis.schema.types.length} (${competitorAnalysis.schema.types.join(', ')})

### 🚨 CRITICAL GAPS TO FIX (Competitive Score: ${comparison.score}/100)

`;

    // Add critical actions
    if (comparison.criticalActions.length > 0) {
      report += `#### Immediate Action Required:\n`;
      comparison.criticalActions.forEach((action, index) => {
        report += `${index + 1}. **[${action.priority.toUpperCase()}]** ${action.action}\n`;
      });
      report += `\n`;
    }

    // Add all gaps
    report += `#### All Competitive Gaps:\n`;
    comparison.gaps.forEach((gap, index) => {
      report += `${index + 1}. **${gap.category}** (${gap.impact} impact): ${gap.issue}\n   → Action: ${gap.action}\n\n`;
    });

    // Add advantages
    if (comparison.advantages.length > 0) {
      report += `### ✅ YOUR ADVANTAGES\n`;
      comparison.advantages.forEach((advantage, index) => {
        report += `${index + 1}. **${advantage.category}**: ${advantage.advantage}\n   → ${advantage.leverage}\n\n`;
      });
    }

    report += `### Competitive Summary
- **Total Gaps**: ${comparison.summary.totalGaps}
- **High Impact Gaps**: ${comparison.summary.highImpactGaps}
- **Content Length Difference**: ${comparison.summary.contentLengthDifference > 0 ? '+' : ''}${comparison.summary.contentLengthDifference} words
- **Recommendation**: ${comparison.summary.recommendation}

`;
  }

  // Add general issues and recommendations
  report += `## 🛠 ALL ISSUES & RECOMMENDATIONS

### Critical Issues (Must Fix)
`;
  const criticalIssues = yourAnalysis.issues.filter(issue => issue.type === 'error');
  if (criticalIssues.length === 0) {
    report += `✅ No critical issues found!\n\n`;
  } else {
    criticalIssues.forEach((issue, index) => {
      report += `${index + 1}. **${issue.category}**: ${issue.message}\n`;
    });
    report += `\n`;
  }

  report += `### Warnings & Improvements
`;
  const warnings = yourAnalysis.issues.filter(issue => issue.type === 'warning');
  if (warnings.length === 0) {
    report += `✅ No warnings found!\n\n`;
  } else {
    warnings.forEach((issue, index) => {
      report += `${index + 1}. **${issue.category}**: ${issue.message}\n`;
    });
    report += `\n`;
  }

  // Add prioritized recommendations
  report += `## 📋 PRIORITIZED ACTION PLAN

### 🔴 Critical Priority (Fix Immediately)
`;
  const criticalRecs = yourAnalysis.recommendations.filter(rec => rec.priority === 'critical');
  if (criticalRecs.length === 0) {
    report += `✅ No critical actions needed!\n\n`;
  } else {
    criticalRecs.forEach((rec, index) => {
      report += `${index + 1}. ${rec.action}\n`;
    });
    report += `\n`;
  }

  report += `### 🟠 High Priority (Fix This Week)
`;
  const highRecs = yourAnalysis.recommendations.filter(rec => rec.priority === 'high');
  if (highRecs.length === 0) {
    report += `✅ No high priority actions needed!\n\n`;
  } else {
    highRecs.forEach((rec, index) => {
      report += `${index + 1}. ${rec.action}\n`;
    });
    report += `\n`;
  }

  report += `### 🟡 Medium Priority (Fix This Month)
`;
  const mediumRecs = yourAnalysis.recommendations.filter(rec => rec.priority === 'medium');
  if (mediumRecs.length === 0) {
    report += `✅ No medium priority actions needed!\n\n`;
  } else {
    mediumRecs.forEach((rec, index) => {
      report += `${index + 1}. ${rec.action}\n`;
    });
    report += `\n`;
  }

  // Add specific instructions for AI
  report += `---

## 🤖 INSTRUCTIONS FOR AI ASSISTANT

Please help me implement the above SEO improvements. Here's what I need:

### Context:
- This is ${isPillarPost ? 'a pillar post that should comprehensively cover the topic' : 'regular content'}
- Target keyword: "${targetKeyword || 'Not specified'}"
- Current page: ${yourAnalysis.url}
${competitorAnalysis ? `- Main competitor: ${competitorAnalysis.url}` : ''}

### Current Issues Summary:
- Content length: ${yourAnalysis.contentLength} words ${isPillarPost ? '(pillar post needs 2000+)' : '(regular content needs 300+)'}
- Title optimization: ${yourAnalysis.titleLength} characters ${yourAnalysis.titleLength < 50 || yourAnalysis.titleLength > 60 ? '(needs optimization)' : '(good)'}
- Meta description: ${yourAnalysis.metaDescriptionLength} characters ${yourAnalysis.metaDescriptionLength < 150 || yourAnalysis.metaDescriptionLength > 160 ? '(needs optimization)' : '(good)'}
- H1 structure: ${yourAnalysis.headings.h1.count} H1 tag(s) ${yourAnalysis.headings.h1.count !== 1 ? '(needs fix)' : '(good)'}

### What I Need Help With:
1. **Content Optimization**: Help me rewrite/expand content to address the gaps identified above
2. **Technical Implementation**: Provide code/HTML for missing technical elements
3. **Schema Markup**: Generate the JSON-LD schema code I need to add
4. **Meta Tags**: Write optimized title and meta description tags
5. **Content Structure**: Suggest heading hierarchy and content organization

### Priority Focus:
${comparison && comparison.criticalActions.length > 0 ? 
  `Focus on these critical competitive gaps first:\n${comparison.criticalActions.map(action => `- ${action.action}`).join('\n')}` : 
  'Focus on the critical and high priority recommendations listed above'}

Please provide specific, actionable advice and code examples where applicable.

---
*Report generated by SEO Analyzer on ${date}*`;

  return report;
}

 // Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
