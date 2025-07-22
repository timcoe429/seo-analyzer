import React, { useState } from 'react';
import { Upload, Target, BarChart3, AlertCircle, FileText } from 'lucide-react';
import './App.css';

function App() {
  const [domain, setDomain] = useState('');
  const [yourFiles, setYourFiles] = useState([]);
  const [competitorFiles, setCompetitorFiles] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleYourFiles = (files) => {
    setYourFiles(Array.from(files));
  };

  const handleCompetitorFiles = (files) => {
    setCompetitorFiles(Array.from(files));
  };

  const analyzeCompetition = async () => {
    if (!domain) {
      setError('Please enter your domain');
      return;
    }
    
    if (yourFiles.length === 0 || competitorFiles.length === 0) {
      setError('Please upload both your files and competitor files');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResults(null);

    try {
      // Upload your files
      await Promise.all(
        yourFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('domain', domain);
          formData.append('isCompetitor', 'false');
          
          const response = await fetch('/api/upload-semrush', {
            method: 'POST',
            body: formData
          });
          
          return response.json();
        })
      );

      // Upload competitor files
      await Promise.all(
        competitorFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('domain', domain);
          formData.append('isCompetitor', 'true');
          
          const response = await fetch('/api/upload-semrush', {
            method: 'POST',
            body: formData
          });
          
          return response.json();
        })
      );

      // Run competitive analysis
      const analysisResponse = await fetch('/api/analyze-competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });

      const results = await analysisResponse.json();
      setAnalysisResults(results);

    } catch (error) {
      setError('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">SEMRush Competitive Analyzer</h1>
        <p className="text-gray-600">Upload your SEMRush data vs competitors and find out exactly how to win</p>
      </div>

      {/* Domain Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <label className="block text-lg font-medium text-gray-700 mb-3">
          Your Domain
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="servicecore.com"
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* File Upload Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Your Files */}
        <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg p-8">
          <div className="text-center">
            <Upload className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">Your SEMRush Files</h3>
            <p className="text-sm text-green-700 mb-4">
              Upload ALL your SEMRush reports (domain overview, keyword gap, backlink gap, organic research)
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.pdf"
              onChange={(e) => handleYourFiles(e.target.files)}
              className="hidden"
              id="yourFiles"
            />
            <label
              htmlFor="yourFiles"
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 cursor-pointer inline-block"
            >
              Choose Your Files
            </label>
            
            {yourFiles.length > 0 && (
              <div className="mt-4 text-left">
                <p className="font-medium text-green-900 mb-2">Selected ({yourFiles.length} files):</p>
                {yourFiles.map((file, index) => (
                  <div key={index} className="text-sm text-green-700 bg-white p-2 rounded mb-1">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Competitor Files */}
        <div className="bg-red-50 border-2 border-dashed border-red-300 rounded-lg p-8">
          <div className="text-center">
            <Target className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Competitor SEMRush Files</h3>
            <p className="text-sm text-red-700 mb-4">
              Upload ALL competitor SEMRush reports (same types as yours for comparison)
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.pdf"
              onChange={(e) => handleCompetitorFiles(e.target.files)}
              className="hidden"
              id="competitorFiles"
            />
            <label
              htmlFor="competitorFiles"
              className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 cursor-pointer inline-block"
            >
              Choose Competitor Files
            </label>
            
            {competitorFiles.length > 0 && (
              <div className="mt-4 text-left">
                <p className="font-medium text-red-900 mb-2">Selected ({competitorFiles.length} files):</p>
                {competitorFiles.map((file, index) => (
                  <div key={index} className="text-sm text-red-700 bg-white p-2 rounded mb-1">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="text-center mb-8">
        <button
          onClick={analyzeCompetition}
          disabled={loading || !domain || yourFiles.length === 0 || competitorFiles.length === 0}
          className="bg-blue-600 text-white px-8 py-4 text-lg rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
        >
          <BarChart3 className="w-6 h-6" />
          {loading ? 'Analyzing Competition...' : 'Analyze Competition'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {analysisResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Competitive Analysis Results
          </h2>

          {/* Action Plan */}
          {analysisResults.actionPlan && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Action Plan to Beat Competition</h3>
              <div className="space-y-4">
                {analysisResults.actionPlan.map((action, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    action.priority === 'critical' ? 'bg-red-50 border-red-500' :
                    action.priority === 'high' ? 'bg-orange-50 border-orange-500' :
                    'bg-yellow-50 border-yellow-500'
                  }`}>
                    <div className="font-semibold text-gray-900">{action.title}</div>
                    <div className="text-gray-700 mt-1">{action.description}</div>
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Why:</strong> {action.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          {analysisResults.insights && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Keyword Opportunities</h4>
                <div className="text-2xl font-bold text-blue-900">{analysisResults.insights.keywordGaps || 0}</div>
                <div className="text-sm text-blue-700">Missing keywords to target</div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Backlink Opportunities</h4>
                <div className="text-2xl font-bold text-green-900">{analysisResults.insights.backlinkGaps || 0}</div>
                <div className="text-sm text-green-700">Potential new backlinks</div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Competitive Score</h4>
                <div className="text-2xl font-bold text-purple-900">{analysisResults.insights.competitiveScore || 0}/100</div>
                <div className="text-sm text-purple-700">Your ranking potential</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
