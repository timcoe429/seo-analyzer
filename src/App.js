import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, ExternalLink, Copy, Users, Target, File } from 'lucide-react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isPillarPost, setIsPillarPost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const [copySuccess, setCopySuccess] = useState(false);

  const analyzeURL = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url, 
          targetKeyword: targetKeyword || undefined,
          competitorUrl: competitorUrl || undefined,
          isPillarPost 
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      
      // Check if the response has an error
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setResults(data);
      
      // If there's competitor data, switch to comparison tab
      if (data.comparison) {
        setActiveTab('comparison');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to analyze URL. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyAIReport = async () => {
    if (results?.aiReport) {
      try {
        await navigator.clipboard.writeText(results.aiReport);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'text-red-600 font-semibold';
      case 'medium': return 'text-orange-600 font-medium';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const analysis = results?.analysis;
  const comparison = results?.comparison;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Professional SEO Analyzer</h1>
        <p className="text-gray-600">Analyze any webpage for on-page SEO optimization + competitor comparison</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Website URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com/page"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Keyword (optional)
              </label>
              <input
                type="text"
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="septic software"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competitor URL (optional)
              </label>
              <input
                type="url"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://competitor.com/page"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pillarPost"
              checked={isPillarPost}
              onChange={(e) => setIsPillarPost(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="pillarPost" className="text-sm text-gray-700">
              This is a pillar post (comprehensive topic coverage)
            </label>
          </div>

          <button
            onClick={analyzeURL}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Analyze SEO'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Your Page Analysis
                </div>
              </button>
              
              {comparison && (
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'comparison'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    vs Competitor
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                      Score: {comparison.score}/100
                    </span>
                  </div>
                </button>
              )}
              
              {results.aiReport && (
                <button
                  onClick={() => setActiveTab('aiReport')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'aiReport'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                                         <File className="w-4 h-4" />
                     AI Report
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Analysis Tab */}
          {activeTab === 'analysis' && analysis && (
            <div className="space-y-6">
              {/* Page Overview */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Page Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Title ({analysis.titleLength} chars)</p>
                    <p className="font-medium break-words">{analysis.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">URL</p>
                    <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 break-all">
                      {analysis.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Meta Description ({analysis.metaDescriptionLength} chars)</p>
                    <p className="text-sm break-words">{analysis.metaDescription || 'Not found'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Content Info</p>
                    <p className="font-medium">
                      {analysis.contentLength} words • Readability: {analysis.readabilityScore}/100
                      {analysis.isPillarPost && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Pillar Post</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Heading Structure */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Heading Structure</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                                     {Object.entries(analysis.headings || {}).map(([tag, data]) => (
                    <div key={tag} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{data.count}</div>
                      <div className="text-sm text-gray-600 uppercase">{tag}</div>
                    </div>
                  ))}
                </div>
                
                {analysis.headings.h1.count !== 1 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ You have {analysis.headings.h1.count} H1 tags. Best practice is exactly 1 H1 per page.
                    </p>
                  </div>
                )}
              </div>

              {/* Technical SEO */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Technical SEO</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    {analysis.technical.viewport ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                    <span className="text-sm">Viewport Meta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.technical.charset ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                    <span className="text-sm">Charset</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.technical.canonical ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                    <span className="text-sm">Canonical URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.technical.favicon ? 
                      <CheckCircle className="w-5 h-5 text-green-500" /> : 
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                    <span className="text-sm">Favicon</span>
                  </div>
                </div>
              </div>

              {/* Links & Images */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Links & Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analysis.internalLinks}</div>
                    <div className="text-sm text-gray-600">Internal Links</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analysis.externalLinks}</div>
                    <div className="text-sm text-gray-600">External Links</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analysis.images.total}</div>
                    <div className="text-sm text-gray-600">Total Images</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analysis.images.withoutAlt}</div>
                    <div className="text-sm text-gray-600">Missing Alt Text</div>
                  </div>
                </div>
              </div>

              {/* Schema Markup */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Schema Markup</h2>
                {analysis.schema.types && analysis.schema.types.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.schema.types.map((schemaType, index) => (
                      <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {schemaType}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No schema markup detected</p>
                )}
              </div>

              {/* Keyword Analysis */}
              {targetKeyword && analysis.keywordAnalysis && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">Keyword Analysis: "{targetKeyword}"</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      {analysis.keywordAnalysis.titleContainsKeyword ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                      <span className="text-sm">In Title</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {analysis.keywordAnalysis.h1ContainsKeyword ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                      <span className="text-sm">In H1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {analysis.keywordAnalysis.metaContainsKeyword ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                      <span className="text-sm">In Meta Desc</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Density: </span>
                      <span className="font-medium">{analysis.keywordAnalysis.exactDensity}% exact, {analysis.keywordAnalysis.partialDensity}% partial</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Issues Found</h2>
                <div className="space-y-3">
                  {analysis.issues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{issue.category}</div>
                        <div className="text-sm text-gray-600">{issue.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 border rounded-md ${getPriorityColor(rec.priority)}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {rec.priority} Priority
                        </span>
                      </div>
                      <div className="text-sm">{rec.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Competitor Comparison Tab */}
          {activeTab === 'comparison' && comparison && (
            <div className="space-y-6">
              {/* Competitive Score */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Competitive Analysis
                </h2>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{comparison.score}/100</div>
                    <div className="text-sm text-gray-600">Competitive Score</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">{comparison.summary.recommendation}</div>
                    <div className="text-sm text-gray-600">
                      {comparison.summary.totalGaps} gaps found ({comparison.summary.highImpactGaps} high impact)
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Actions */}
              {comparison.criticalActions.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-red-800">🚨 Critical Actions Required</h3>
                                   <div className="space-y-3">
                   {(comparison.criticalActions || []).map((action, index) => (
                      <div key={index} className="bg-white p-4 rounded-md border border-red-200">
                        <div className="font-medium text-red-800">{action.category}</div>
                        <div className="text-sm text-red-700">{action.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Gaps */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Competitive Gaps</h3>
                                 <div className="space-y-3">
                   {(comparison.gaps || []).map((gap, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">{gap.category}</div>
                        <span className={`text-sm ${getImpactColor(gap.impact)}`}>
                          {gap.impact} impact
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{gap.issue}</div>
                      <div className="text-sm font-medium text-blue-600">→ {gap.action}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advantages */}
              {comparison.advantages.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-green-800">✅ Your Advantages</h3>
                                     <div className="space-y-3">
                     {(comparison.advantages || []).map((advantage, index) => (
                      <div key={index} className="bg-white p-4 rounded-md border border-green-200">
                        <div className="font-medium text-green-800">{advantage.category}</div>
                        <div className="text-sm text-green-700">{advantage.advantage}</div>
                        <div className="text-sm text-green-600 mt-1">→ {advantage.leverage}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Report Tab */}
          {activeTab === 'aiReport' && results.aiReport && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                                     <h2 className="text-xl font-semibold flex items-center gap-2">
                     <File className="w-5 h-5" />
                     AI-Ready Report
                   </h2>
                  <button
                    onClick={copyAIReport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess ? 'Copied!' : 'Copy Report'}
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  Copy this report and paste it into Claude or ChatGPT to get specific help implementing the SEO improvements.
                </p>
                <div className="bg-gray-50 p-4 rounded-md border">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {results.aiReport}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
