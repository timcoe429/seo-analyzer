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

      {/* Results Display */}
      {analysisResults && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6 border-2 border-green-200">
          <h3 className="text-xl font-semibold mb-4 text-green-900">🎯 Real Competitive Analysis Results</h3>
          
          {/* Summary */}
          <div className="mb-6 p-4 bg-green-50 rounded-md">
            <p className="text-green-800 font-medium">{analysisResults.summary}</p>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Keyword Gaps</h4>
              <div className="text-2xl font-bold text-red-900">{analysisResults.insights.keywordGaps}</div>
              <div className="text-sm text-red-700">Keywords where competitor beats you</div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">Backlink Opportunities</h4>
              <div className="text-2xl font-bold text-orange-900">{analysisResults.insights.backlinkGaps}</div>
              <div className="text-sm text-orange-700">Domains linking to them, not you</div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Competitive Score</h4>
              <div className="text-2xl font-bold text-blue-900">{analysisResults.insights.competitiveScore}/100</div>
              <div className="text-sm text-blue-700">Your competitive position</div>
            </div>
          </div>

          {/* Action Plan */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">🎯 Action Plan to Beat Competition</h4>
            <div className="space-y-3">
              {analysisResults.actionPlan.map((action, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  action.priority === 'critical' ? 'bg-red-50 border-red-500' :
                  action.priority === 'high' ? 'bg-orange-50 border-orange-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}>
                  <div className="font-semibold text-gray-900 flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      action.priority === 'critical' ? 'bg-red-500' :
                      action.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}></span>
                    {action.title}
                  </div>
                  <div className="text-gray-700 mt-1">{action.description}</div>
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Why:</strong> {action.reason}
                  </div>
                  {action.keyword && (
                    <div className="text-xs text-gray-500 mt-1">
                      Keyword: {action.keyword} | Gap: {action.gap} positions | Volume: {action.volume?.toLocaleString()}
                    </div>
                  )}
                  {action.domain && (
                    <div className="text-xs text-gray-500 mt-1">
                      Domain: {action.domain} | Authority: {action.domainAuthority} | Their links: {action.competitorBacklinks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
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
