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
      
      schema: []
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
    if (analysis.contentLength < 300) {
      issues.push({ type: 'warning', category: 'Content', message: `Content is quite short (${analysis.contentLength} words)` });
      recommendations.push({ priority: 'medium', action: 'Consider adding more valuable content (aim for 300+ words)' });
    } else if (analysis.contentLength > 2000) {
      issues.push({ type: 'info', category: 'Content', message: `Very long content (${analysis.contentLength} words)` });
      recommendations.push({ priority: 'low', action: 'Consider breaking into multiple pages or sections' });
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
      if (ka.exactDensity < 0.5 && ka.partialDensity < 1) {
        recommendations.push({ 
          priority: 'medium', 
          action: `Increase keyword presence (exact: ${ka.exactDensity}%, partial: ${ka.partialDensity}%)` 
        });
      } else if (ka.exactDensity > 3) {
        recommendations.push({ 
          priority: 'medium', 
          action: `Reduce exact keyword density to avoid over-optimization (currently ${ka.exactDensity}%)` 
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
