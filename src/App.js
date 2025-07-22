import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

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
        body: JSON.stringify({ url, targetKeyword }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const analysisResults = await response.json();
      setResults(analysisResults);
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to analyze URL. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">On-Page SEO Analyzer</h1>
        <p className="text-gray-600">Analyze any webpage for on-page SEO optimization opportunities</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Keyword (optional)
            </label>
            <input
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="digital marketing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
          {/* Page Overview */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Page Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Title</p>
                <p className="font-medium break-words">{results.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">URL</p>
                <a href={results.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 break-all">
                  {results.url} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-600">Meta Description</p>
                <p className="text-sm break-words">{results.metaDescription || 'Not found'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Content Length</p>
                <p className="font-medium">{results.contentLength} words</p>
              </div>
            </div>
          </div>

          {/* Heading Structure */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Heading Structure</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {Object.entries(results.headings).map(([tag, data]) => (
                <div key={tag} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{data.count}</div>
                  <div className="text-sm text-gray-600 uppercase">{tag}</div>
                </div>
              ))}
            </div>
            
            {results.headings.h1.count !== 1 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">
                  ⚠️ You have {results.headings.h1.count} H1 tags. Best practice is exactly 1 H1 per page.
                </p>
              </div>
            )}
          </div>

          {/* Links & Images */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Links & Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{results.internalLinks}</div>
                <div className="text-sm text-gray-600">Internal Links</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{results.externalLinks}</div>
                <div className="text-sm text-gray-600">External Links</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{results.images.total}</div>
                <div className="text-sm text-gray-600">Total Images</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{results.images.withoutAlt}</div>
                <div className="text-sm text-gray-600">Missing Alt Text</div>
              </div>
            </div>
          </div>

          {/* Schema Markup */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Schema Markup</h2>
            {results.schema.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {results.schema.map((schemaType, index) => (
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
          {targetKeyword && results.keywordAnalysis && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Keyword Analysis: "{targetKeyword}"</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  {results.keywordAnalysis.titleContainsKeyword ? 
                    <CheckCircle className="w-5 h-5 text-green-500" /> : 
                    <XCircle className="w-5 h-5 text-red-500" />
                  }
                  <span className="text-sm">In Title</span>
                </div>
                <div className="flex items-center gap-2">
                  {results.keywordAnalysis.h1ContainsKeyword ? 
                    <CheckCircle className="w-5 h-5 text-green-500" /> : 
                    <XCircle className="w-5 h-5 text-red-500" />
                  }
                  <span className="text-sm">In H1</span>
                </div>
                <div className="flex items-center gap-2">
                  {results.keywordAnalysis.metaContainsKeyword ? 
                    <CheckCircle className="w-5 h-5 text-green-500" /> : 
                    <XCircle className="w-5 h-5 text-red-500" />
                  }
                  <span className="text-sm">In Meta Desc</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Keyword Density: </span>
                  <span className="font-medium">{results.keywordAnalysis.density}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Issues */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Issues Found</h2>
            <div className="space-y-3">
              {results.issues.map((issue, index) => (
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
              {results.recommendations.map((rec, index) => (
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
    </div>
  );
}

export default App;
