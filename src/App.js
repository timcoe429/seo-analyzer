import React, { useState } from 'react';
import { Upload, AlertCircle, Database, Eye } from 'lucide-react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setDiscoveryResults(null);
    setError('');
  };

  const discoverData = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');
    setDiscoveryResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/discover-data', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const results = await response.json();
      console.log('Discovery results:', results);
      setDiscoveryResults(results);
    } catch (error) {
      console.error('Discovery error:', error);
      setError('Discovery failed: ' + error.message + '. Check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Phase A: SEMRush Data Discovery
          </h1>
          <p className="text-gray-600">
            Upload ONE SEMRush file to see its actual structure and column names
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" size={20} />
            Upload SEMRush File
          </h2>
          
          <div className="mb-4">
            <input
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={discoverData}
            disabled={!selectedFile || loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Eye className="mr-2" size={16} />
                Discover Data Structure
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {discoveryResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="mr-2" size={20} />
              File Structure Discovery
            </h2>

            {/* File Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">File Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Name:</strong> {discoveryResults.fileName}</div>
                <div><strong>Size:</strong> {(discoveryResults.fileSize / 1024).toFixed(1)} KB</div>
                <div><strong>Type:</strong> {discoveryResults.fileType}</div>
                <div><strong>Format:</strong> {discoveryResults.isCSV ? 'CSV' : discoveryResults.isPDF ? 'PDF' : 'Unknown'}</div>
              </div>
            </div>

            {/* CSV Results */}
            {discoveryResults.isCSV && discoveryResults.columnNames && (
              <>
                {/* Column Names */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Column Names ({discoveryResults.columnNames.length} total)</h3>
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {discoveryResults.columnNames.map((col, index) => (
                        <div key={index} className="bg-white px-3 py-1 rounded text-sm font-mono">
                          {col}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Data */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Sample Data (First 5 rows of {discoveryResults.totalRows} total)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {discoveryResults.columnNames.slice(0, 10).map((col, index) => (
                            <th key={index} className="px-2 py-1 border border-gray-200 font-semibold">
                              {col}
                            </th>
                          ))}
                          {discoveryResults.columnNames.length > 10 && (
                            <th className="px-2 py-1 border border-gray-200 font-semibold">
                              ... +{discoveryResults.columnNames.length - 10} more
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {discoveryResults.sampleRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {discoveryResults.columnNames.slice(0, 10).map((col, colIndex) => (
                              <td key={colIndex} className="px-2 py-1 border border-gray-200">
                                {String(row[col] || '').substring(0, 50)}
                                {String(row[col] || '').length > 50 && '...'}
                              </td>
                            ))}
                            {discoveryResults.columnNames.length > 10 && (
                              <td className="px-2 py-1 border border-gray-200 text-gray-500">
                                ...
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Column Details */}
                <div>
                  <h3 className="font-semibold mb-2">Column Analysis</h3>
                  <div className="space-y-2">
                    {discoveryResults.allColumns.slice(0, 20).map((col, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md">
                        <div className="font-semibold text-sm mb-1">{col.name}</div>
                        <div className="text-xs text-gray-600">
                          Sample values: {col.sampleValues.slice(0, 3).join(', ')}
                          {col.sampleValues.length > 3 && ` ... +${col.sampleValues.length - 3} more`}
                        </div>
                      </div>
                    ))}
                    {discoveryResults.allColumns.length > 20 && (
                      <div className="text-center text-gray-500 text-sm">
                        ... and {discoveryResults.allColumns.length - 20} more columns
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* PDF Results */}
            {discoveryResults.isPDF && (
              <div className="p-4 bg-yellow-50 rounded-md">
                <p className="text-yellow-800">{discoveryResults.message}</p>
                {discoveryResults.base64Preview && (
                  <div className="mt-2">
                    <p className="text-xs text-yellow-600">Base64 preview:</p>
                    <code className="text-xs bg-yellow-100 p-2 rounded block mt-1">
                      {discoveryResults.base64Preview}
                    </code>
                  </div>
                )}
              </div>
            )}

            {/* Error in Results */}
            {discoveryResults.error && (
              <div className="p-4 bg-red-50 rounded-md">
                <p className="text-red-800">{discoveryResults.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 What This Does</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Upload ONE SEMRush file (CSV or PDF)</li>
            <li>• See the exact column names that exist in your data</li>
            <li>• View sample rows to understand the data format</li>
            <li>• No analysis yet - just pure data discovery</li>
            <li>• This helps us build analysis logic around YOUR actual data structure</li>
          </ul>
        </div>

        {/* Phase B Section */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
          <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center">
            🚀 Phase B: REAL Competitive Analysis
          </h2>
          <p className="text-green-800 mb-4">
            Upload your keyword gap and backlink gap CSV files for analysis using REAL column structures from Phase A discovery.
          </p>
          
          <PhaseBAnalysis />
        </div>
      </div>
    </div>
  );
}

// Phase B Component for Real Competitive Analysis
function PhaseBAnalysis() {
  const [files, setFiles] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files));
    setAnalysisResults(null);
    setError('');
  };

  const analyzeReal = async () => {
    if (files.length === 0) {
      setError('Please select your SEMRush CSV files');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResults(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/analyze-competition-real', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const results = await response.json();
      console.log('Phase B results:', results);
      setAnalysisResults(results);
    } catch (error) {
      console.error('Phase B error:', error);
      setError('Analysis failed: ' + error.message + '. Check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* File Upload */}
      <div className="mb-4">
        <input
          type="file"
          multiple
          accept=".csv"
          onChange={handleFilesChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
        />
        {files.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-1">Selected files:</p>
            {files.map((file, index) => (
              <div key={index} className="text-xs text-green-700 bg-green-100 p-1 rounded mb-1">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={analyzeReal}
        disabled={files.length === 0 || loading}
        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Analyzing with Real Data...
          </>
        ) : (
          <>
            <Database className="mr-2" size={16} />
            Run REAL Competitive Analysis
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Phase B Results */}
      {analysisResults && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🎯 Competitive Analysis Results</h3>
          
          {/* Summary Section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-6 border">
            <h4 className="font-semibold text-gray-900 mb-3">📊 Analysis Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysisResults.summary?.keywordGaps || 0}</div>
                <div className="text-sm text-gray-600">Keyword Gaps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysisResults.summary?.backlinkGaps || 0}</div>
                <div className="text-sm text-gray-600">Backlink Gaps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysisResults.summary?.competitiveScore || 0}</div>
                <div className="text-sm text-gray-600">Competitive Score</div>
              </div>
            </div>
          </div>

          {/* WHY Analysis Section */}
          {analysisResults.whyAnalysis && analysisResults.whyAnalysis.length > 0 && (
            <div className="bg-red-50 rounded-lg p-6 mb-6 border-2 border-red-200">
              <h4 className="font-semibold text-red-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                🔍 WHY They're Winning (Root Cause Analysis)
              </h4>
              <div className="space-y-3">
                {analysisResults.whyAnalysis.map((why, index) => (
                  <div key={index} className="bg-white rounded p-4 border-l-4 border-red-400">
                    <div className="font-medium text-red-800">{why.reason}</div>
                    <div className="text-sm text-red-600 mt-1">{why.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain Comparison */}
          {analysisResults.domainComparison && (
            <div className="bg-yellow-50 rounded-lg p-6 mb-6 border-2 border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-4">⚖️ Domain Authority Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Your Domain</h5>
                  <div className="space-y-1 text-sm">
                    {analysisResults.domainComparison.yourMetrics.authorityScore && (
                      <div>Authority Score: <span className="font-medium">{analysisResults.domainComparison.yourMetrics.authorityScore}</span></div>
                    )}
                    {analysisResults.domainComparison.yourMetrics.organicTraffic && (
                      <div>Monthly Traffic: <span className="font-medium">{analysisResults.domainComparison.yourMetrics.organicTraffic.toLocaleString()}</span></div>
                    )}
                    {analysisResults.domainComparison.yourMetrics.totalBacklinks && (
                      <div>Backlinks: <span className="font-medium">{analysisResults.domainComparison.yourMetrics.totalBacklinks.toLocaleString()}</span></div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Competitor Domain</h5>
                  <div className="space-y-1 text-sm">
                    {analysisResults.domainComparison.competitorMetrics.authorityScore && (
                      <div>Authority Score: <span className="font-medium">{analysisResults.domainComparison.competitorMetrics.authorityScore}</span></div>
                    )}
                    {analysisResults.domainComparison.competitorMetrics.organicTraffic && (
                      <div>Monthly Traffic: <span className="font-medium">{analysisResults.domainComparison.competitorMetrics.organicTraffic.toLocaleString()}</span></div>
                    )}
                    {analysisResults.domainComparison.competitorMetrics.totalBacklinks && (
                      <div>Backlinks: <span className="font-medium">{analysisResults.domainComparison.competitorMetrics.totalBacklinks.toLocaleString()}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Keyword Analysis Section */}
          {analysisResults.keywordAnalysis && (
            <div className="bg-purple-50 rounded-lg p-6 mb-6 border-2 border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4">🔑 Keyword Gap Analysis</h4>
              <div className="text-sm text-purple-700 mb-3">
                Found {analysisResults.keywordAnalysis.gapCount} keyword opportunities where competitor ranks better.
              </div>
              {analysisResults.keywordAnalysis.actions && analysisResults.keywordAnalysis.actions.length > 0 && (
                <div className="space-y-2">
                  {analysisResults.keywordAnalysis.actions.slice(0, 5).map((action, index) => (
                    <div key={index} className="bg-white rounded p-3 border-l-4 border-purple-400">
                      <div className="font-medium text-purple-800">{action.title}</div>
                      <div className="text-sm text-purple-600">{action.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Backlink Analysis Section */}
          {analysisResults.backlinkAnalysis && (
            <div className="bg-green-50 rounded-lg p-6 mb-6 border-2 border-green-200">
              <h4 className="font-semibold text-green-900 mb-4">🔗 Backlink Gap Analysis</h4>
              <div className="text-sm text-green-700 mb-3">
                Found {analysisResults.backlinkAnalysis.gapCount} backlink opportunities from high-authority domains.
              </div>
              {analysisResults.backlinkAnalysis.actions && analysisResults.backlinkAnalysis.actions.length > 0 && (
                <div className="space-y-2">
                  {analysisResults.backlinkAnalysis.actions.slice(0, 5).map((action, index) => (
                    <div key={index} className="bg-white rounded p-3 border-l-4 border-green-400">
                      <div className="font-medium text-green-800">{action.title}</div>
                      <div className="text-sm text-green-600">{action.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Plan */}
          {analysisResults.actionPlan && analysisResults.actionPlan.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6 border">
              <h4 className="font-semibold text-gray-900 mb-4">📋 Priority Action Plan</h4>
              <div className="space-y-3">
                {analysisResults.actionPlan.slice(0, 10).map((action, index) => (
                  <div key={index} className={`p-4 rounded border-l-4 ${
                    action.priority === 'critical' ? 'bg-red-50 border-red-400' :
                    action.priority === 'high' ? 'bg-orange-50 border-orange-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{action.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{action.description}</div>
                        {action.reason && (
                          <div className="text-xs text-gray-500 mt-2">{action.reason}</div>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        action.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        action.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-green-50 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">📋 How to Use Phase B</h4>
        <ul className="text-green-800 text-sm space-y-1">
          <li>• Upload your keyword gap CSV (like "keyword-gap-analysis-sc.csv")</li>
          <li>• Upload your backlink gap CSV (like "backlink-gap.csv")</li>
          <li>• Uses REAL column names discovered in Phase A</li>
          <li>• Finds actual competitive gaps with prioritized action plan</li>
          <li>• Should find your "Septic Business Software" gap and others!</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
