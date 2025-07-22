import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, ExternalLink, Copy, Users, Target, File, Plus, Upload, Folder, Calendar, BarChart3, X } from 'lucide-react';
import './App.css';

function App() {
  // Project state
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form state
  const [url, setUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isPillarPost, setIsPillarPost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const [copySuccess, setCopySuccess] = useState(false);

  // Project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportType, setReportType] = useState('domain_overview');
  const [isCompetitor, setIsCompetitor] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
        
        // Auto-select first project if available
        if (projectsData.length > 0 && !currentProject) {
          setCurrentProject(projectsData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName || !newProjectDomain) {
      setError('Project name and domain are required');
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          domain: newProjectDomain
        })
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects([newProject, ...projects]);
        setCurrentProject(newProject);
        setShowProjectModal(false);
        setNewProjectName('');
        setNewProjectDomain('');
        setError('');
      }
    } catch (error) {
      setError('Failed to create project');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !currentProject) {
      setError('Please select a file and project');
      return;
    }

    setUploadLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('reportType', reportType);
      formData.append('isCompetitor', isCompetitor);

      const response = await fetch(`/api/projects/${currentProject.id}/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setShowUploadModal(false);
        setSelectedFile(null);
        alert(`File uploaded successfully! Parsed ${result.parsedRows} rows.`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Upload failed');
      }
    } catch (error) {
      setError('Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const analyzeURL = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    if (!currentProject) {
      setError('Please select a project first');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const endpoint = currentProject ? 
        `/api/projects/${currentProject.id}/analyze` : 
        '/api/analyze';

      const response = await fetch(endpoint, {
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
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setResults(data);
      
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
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">SEO Analyzer Pro</h1>
        <p className="text-gray-600">Comprehensive SEO analysis with SEMRush integration</p>
      </div>

      {/* Project Management Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Folder className="w-5 h-5 text-gray-600" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Project
              </label>
              <select
                value={currentProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === parseInt(e.target.value));
                  setCurrentProject(project);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.domain})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowProjectModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
            
            {currentProject && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                Upload SEMRush
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Form */}
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
            disabled={loading || !currentProject}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Analyze SEO'}
          </button>
          
          {!currentProject && (
            <p className="text-sm text-orange-600 text-center">
              Please select or create a project first
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results Section - Keep existing results display logic */}
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
                  <BarChart3 className="w-4 h-4" />
                  Analysis
                </div>
              </button>
              
              {comparison && (
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'comparison'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    vs Competitor
                  </div>
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('report')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'report'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  AI Report
                </div>
              </button>

              <button
                onClick={() => setActiveTab('semrush')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'semrush'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  SEMRush Data
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content - Analysis */}
          {activeTab === 'analysis' && analysis && (
            <div className="space-y-6">
              {/* Rest of analysis display code remains the same... */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overall Score:</span>
                      <span className="font-semibold text-lg">{analysis.summary?.overallScore || 'N/A'}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Word Count:</span>
                      <span className="font-medium">{analysis.content?.wordCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reading Score:</span>
                      <span className="font-medium">{analysis.content?.readabilityScore || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issues Found:</span>
                      <span className="font-medium">{analysis.issues?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Issues */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issues</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analysis.issues?.slice(0, 5).map((issue, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        {getIssueIcon(issue.type)}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                          <div className="text-xs text-gray-600">{issue.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content - SEMRush */}
          {activeTab === 'semrush' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SEMRush Integration</h3>
              {currentProject ? (
                <div className="text-center py-8">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Upload your SEMRush reports to enhance analysis with competitive intelligence
                  </p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                  >
                    Upload SEMRush File
                  </button>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  Please select a project to manage SEMRush data
                </p>
              )}
            </div>
          )}

          {/* Rest of existing tab content for comparison and report... */}
        </div>
      )}

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Project</h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My SEO Project"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Domain *
                </label>
                <input
                  type="text"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={createProject}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload SEMRush Report</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="domain_overview">Domain Overview</option>
                  <option value="keyword_gap">Keyword Gap Analysis</option>
                  <option value="backlink_gap">Backlink Gap Analysis</option>
                  <option value="organic_research">Organic Research</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File (CSV or PDF)
                </label>
                                 <input
                   type="file"
                   accept=".csv,.pdf"
                   onChange={(e) => setSelectedFile(e.target.files[0])}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCompetitorData"
                  checked={isCompetitor}
                  onChange={(e) => setIsCompetitor(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isCompetitorData" className="text-sm text-gray-700">
                  This is competitor data
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                                 <button
                   onClick={handleFileUpload}
                   disabled={uploadLoading || !selectedFile}
                   className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-green-400"
                 >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
