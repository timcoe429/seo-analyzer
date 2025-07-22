import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, ExternalLink, Copy, Users, Target, File, Upload, Plus, FolderOpen, Database } from 'lucide-react';
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
  
  // Project management states
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    yourDomain: '',
    competitorDomain: ''
  });
  
  // File upload states
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('domain_overview');
  const [isCompetitorFile, setIsCompetitorFile] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const projectsData = await response.json();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjectData)
      });
      const project = await response.json();
      setCurrentProject(project);
      setNewProjectData({ name: '', yourDomain: '', competitorDomain: '' });
      setShowNewProject(false);
      loadProjects();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const uploadSEMrushFile = async () => {
    if (!uploadFile || !currentProject) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('reportType', uploadType);
      formData.append('isCompetitor', isCompetitorFile);

      const response = await fetch(`/api/projects/${currentProject.id}/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        alert('File uploaded and processed successfully!');
        setShowUpload(false);
        setUploadFile(null);
        // Reload project to show new report
        loadProjectDetails(currentProject.id);
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const loadProjectDetails = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      setCurrentProject({ ...data.project, reports: data.reports, latestAnalysis: data.latestAnalysis });
    } catch (error) {
      console.error('Error loading project details:', error);
    }
  };

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
          isPillarPost,
          projectId: currentProject?.id || null
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
      {/* Header with Project Management */}
      <div className="text-center mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-gray-900">SEO Analyzer Pro</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowProjectManager(!showProjectManager)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Database className="w-4 h-4" />
              Projects
            </button>
            {currentProject && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                Upload SEMrush
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600">Comprehensive on-page SEO analysis with competitor comparison and SEMrush integration</p>
        
        {currentProject && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-blue-900">Active Project: </span>
                <span className="text-blue-800">{currentProject.name}</span>
                <span className="text-sm text-blue-600 ml-2">
                  ({currentProject.reports?.length || 0} reports uploaded)
                </span>
              </div>
              <button
                onClick={() => setCurrentProject(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                Change Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Manager Modal */}
      {showProjectManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Project Manager</h2>
              <button
                onClick={() => setShowProjectManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => setShowNewProject(true)}
                className="w-full flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                <Plus className="w-5 h-5" />
                Create New Project
              </button>
              
              {projects.map(project => (
                <div key={project.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-gray-600">
                        {project.your_domain} 
                        {project.competitor_domain && ` vs ${project.competitor_domain}`}
                      </p>
                      <p className="text-xs text-gray-500">{project.report_count} reports</p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentProject(project);
                        setShowProjectManager(false);
                        loadProjectDetails(project.id);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({...newProjectData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="My Site SEO Analysis"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Your Domain</label>
                <input
                  type="text"
                  value={newProjectData.yourDomain}
                  onChange={(e) => setNewProjectData({...newProjectData, yourDomain: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="yoursite.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Competitor Domain (Optional)</label>
                <input
                  type="text"
                  value={newProjectData.competitorDomain}
                  onChange={(e) => setNewProjectData({...newProjectData, competitorDomain: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="competitor.com"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createProject}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Upload SEMrush Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Report Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="domain_overview">Domain Overview</option>
                  <option value="keyword_gap">Keyword Gap</option>
                  <option value="backlink_gap">Backlink Gap</option>
                  <option value="organic_research">Organic Research</option>
                </select>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isCompetitorFile}
                    onChange={(e) => setIsCompetitorFile(e.target.checked)}
                    className="mr-2"
                  />
                  This is competitor data
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File (CSV or PDF)</label>
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={uploadSEMrushFile}
                  disabled={!uploadFile || uploadLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              
              {results.semrushInsights && (
                <button
                  onClick={() => setActiveTab('semrush')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'semrush'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    SEMrush Data
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
                       <div className="text-sm font-medium text-blue-600 mb-2">→ {gap.action}</div>
                       
                       {/* Show specific details */}
                       {gap.details && (
                         <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                           {gap.details.missingElements && gap.details.missingElements.length > 0 && (
                             <div className="mb-2">
                               <span className="font-medium text-sm text-gray-700">Missing: </span>
                               <span className="text-sm text-red-600">{gap.details.missingElements.join(', ')}</span>
                             </div>
                           )}
                           
                           {gap.details.competitorH2Topics && gap.details.competitorH2Topics.length > 0 && (
                             <div className="mb-2">
                               <div className="font-medium text-sm text-gray-700 mb-1">Competitor's H2 Topics:</div>
                               <div className="text-xs text-gray-600 space-y-1">
                                 {gap.details.competitorH2Topics.slice(0, 5).map((topic, i) => (
                                   <div key={i} className="bg-white px-2 py-1 rounded border">"{topic}"</div>
                                 ))}
                               </div>
                               {gap.details.recommendation && (
                                 <div className="mt-2 text-sm text-green-700 font-medium">
                                   💡 {gap.details.recommendation}
                                 </div>
                               )}
                             </div>
                           )}
                           
                           {gap.details.headingBreakdown && gap.details.headingBreakdown.length > 0 && (
                             <div className="mb-2">
                               <span className="font-medium text-sm text-gray-700">Heading gaps: </span>
                               <span className="text-sm text-orange-600">{gap.details.headingBreakdown.join(', ')}</span>
                             </div>
                           )}
                         </div>
                       )}
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

          {/* SEMrush Data Tab */}
          {activeTab === 'semrush' && results.semrushInsights && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5" />
                  SEMrush Competitive Intelligence
                </h2>
                
                {/* Domain Metrics */}
                {results.semrushInsights.domainMetrics && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Domain Authority Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.semrushInsights.domainMetrics.map((domain, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">
                            {domain.isCompetitor ? 'Competitor' : 'Your Site'}
                          </h4>
                          {domain.data.metrics && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Organic Keywords:</span>
                                <span className="font-medium">{domain.data.metrics.organicKeywords?.toLocaleString() || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Organic Traffic:</span>
                                <span className="font-medium">{domain.data.metrics.organicTraffic?.toLocaleString() || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Backlinks:</span>
                                <span className="font-medium">{domain.data.metrics.backlinks?.toLocaleString() || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Authority Score:</span>
                                <span className="font-medium">{domain.data.metrics.authorityScore || 'N/A'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Keyword Gaps */}
                {results.semrushInsights.keywordGaps && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Keyword Opportunities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2 text-red-600">Missing Keywords ({results.semrushInsights.keywordGaps.gaps?.length || 0})</h4>
                        <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                          {(results.semrushInsights.keywordGaps.gaps || []).slice(0, 10).map((keyword, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{keyword.keyword}</span>
                              <span className="text-gray-500">{keyword.searchVolume?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2 text-green-600">Opportunities ({results.semrushInsights.keywordGaps.opportunities?.length || 0})</h4>
                        <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                          {(results.semrushInsights.keywordGaps.opportunities || []).slice(0, 10).map((keyword, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{keyword.keyword}</span>
                              <span className="text-gray-500">#{keyword.yourPosition} → #{keyword.competitorPosition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Backlink Gaps */}
                {results.semrushInsights.backlinkGaps && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Backlink Opportunities</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium">Domain</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Your Links</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Competitor Links</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Authority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(results.semrushInsights.backlinkGaps.domains || []).slice(0, 10).map((domain, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2 text-sm">{domain.domain}</td>
                              <td className="px-4 py-2 text-sm">{domain.yourBacklinks}</td>
                              <td className="px-4 py-2 text-sm">{domain.competitorBacklinks}</td>
                              <td className="px-4 py-2 text-sm">{domain.authorityScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
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
