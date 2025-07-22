import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, Plus, Upload, Folder, BarChart3, X, Users, Target, File } from 'lucide-react';
import './App.css';

function App() {
  // Project state
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectData, setProjectData] = useState(null);
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


  // Project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragOver, setDragOver] = useState(false);

  // Load projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
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
    
    fetchProjects();
  }, [currentProject]);

  // Load project data when project changes
  useEffect(() => {
    const loadProjectData = async () => {
      if (!currentProject) {
        setProjectData(null);
        return;
      }

      try {
        const response = await fetch(`/api/projects/${currentProject.id}`);
        if (response.ok) {
          const data = await response.json();
          setProjectData(data);
        }
      } catch (error) {
        console.error('Failed to load project data:', error);
      }
    };

    loadProjectData();
  }, [currentProject]);



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
      } else {
        const errorData = await response.json();
        if (response.status === 503) {
          setError('Database not connected yet. Please add a PostgreSQL database to Railway first.');
        } else {
          setError(errorData.error || 'Failed to create project');
        }
      }
    } catch (error) {
      console.error('Project creation error:', error);
      setError('Failed to create project - server may not be available');
    }
  };

  // Auto-detect report type from filename
  const detectReportType = (filename) => {
    const name = filename.toLowerCase();
    if (name.includes('domain') || name.includes('overview')) return 'domain_overview';
    if (name.includes('keyword') && name.includes('gap')) return 'keyword_gap';
    if (name.includes('backlink') && name.includes('gap')) return 'backlink_gap';
    if (name.includes('organic')) return 'organic_research';
    return 'domain_overview'; // default
  };

  // Auto-detect if it's competitor data
  const detectIsCompetitor = (filename, reportType) => {
    const name = filename.toLowerCase();
    
    // Gap analysis reports contain both your domain AND competitors in one file
    if (reportType === 'keyword_gap' || reportType === 'backlink_gap') {
      return false; // These are "main domain" files that include competitor data
    }
    
    // Only mark as competitor if it's specifically a competitor-only report
    return name.includes('competitor') || name.includes('comp_') || name.includes('vs_');
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  };

  const handleFilesSelected = (files) => {
    const validFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.csv') || 
      file.name.toLowerCase().endsWith('.pdf')
    );

    const fileObjects = validFiles.map(file => {
      const reportType = detectReportType(file.name);
      return {
        file,
        name: file.name,
        reportType,
        isCompetitor: detectIsCompetitor(file.name, reportType),
        status: 'pending'
      };
    });

    setSelectedFiles(fileObjects);
  };

  const uploadAllFiles = async () => {
    if (!currentProject || selectedFiles.length === 0) {
      setError('Please select files and ensure a project is selected');
      return;
    }

    setUploadLoading(true);
    setError('');
    
    const results = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileObj = selectedFiles[i];
      setUploadProgress(prev => ({ ...prev, [fileObj.name]: 'uploading' }));

      try {
        const formData = new FormData();
        formData.append('file', fileObj.file);
        formData.append('reportType', fileObj.reportType);
        formData.append('isCompetitor', fileObj.isCompetitor);

        const response = await fetch(`/api/projects/${currentProject.id}/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          setUploadProgress(prev => ({ ...prev, [fileObj.name]: 'success' }));
          results.push(`✅ ${fileObj.name}: ${result.parsedRows} rows (${result.fileType})`);
        } else {
          const errorData = await response.json();
          setUploadProgress(prev => ({ ...prev, [fileObj.name]: 'error' }));
          results.push(`❌ ${fileObj.name}: ${errorData.error}`);
        }
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [fileObj.name]: 'error' }));
        results.push(`❌ ${fileObj.name}: Upload failed`);
      }
    }

    alert(`Upload Complete!\n\n${results.join('\n')}`);
    setShowUploadModal(false);
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadLoading(false);
    
    // Refresh project data to show uploaded files
    if (currentProject) {
      try {
        const response = await fetch(`/api/projects/${currentProject.id}`);
        if (response.ok) {
          const data = await response.json();
          setProjectData(data);
        }
      } catch (error) {
        console.error('Failed to refresh project data:', error);
      }
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
      // Use project endpoint if we have a project, otherwise use basic endpoint
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
      
      if (data && data.comparison) {
        setActiveTab('comparison');
      }
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
      case 'info': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const analysis = results?.analysis;

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
              onClick={() => {
                setShowProjectModal(true);
                setError('');
              }}
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
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Analyzing...' : 'Analyze SEO'}
          </button>
          
          {!currentProject && projects.length === 0 && (
            <p className="text-sm text-orange-600 text-center">
              ⚠️ No projects found. Create a project to save your SEO analyses and upload SEMRush data.
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
              
              {results?.comparison && (
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

                 {/* SEMRush Insights or Issues */}
                 <div className="bg-white border border-gray-200 rounded-lg p-6">
                   {projectData?.reports && projectData.reports.length > 0 ? (
                     <div>
                       <h3 className="text-lg font-semibold text-gray-900 mb-4">SEMRush Insights</h3>
                       <div className="space-y-3">
                         <div className="flex justify-between">
                           <span className="text-gray-600">Reports Available:</span>
                           <span className="font-medium">{projectData.reports.length}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-gray-600">Keyword Data:</span>
                           <span className="font-medium">
                             {projectData.reports.filter(r => r.report_type.includes('keyword')).length > 0 ? 'Yes' : 'No'}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-gray-600">Backlink Data:</span>
                           <span className="font-medium">
                             {projectData.reports.filter(r => r.report_type.includes('backlink')).length > 0 ? 'Yes' : 'No'}
                           </span>
                         </div>
                         <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                           <p className="text-sm text-blue-800">
                             ✨ SEMRush data detected! Enhanced competitive analysis available.
                           </p>
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div>
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
                   )}
                 </div>
               </div>
             </div>
           )}

                     {/* Tab Content - Comparison */}
           {activeTab === 'comparison' && results?.comparison && (
             <div className="bg-white border border-gray-200 rounded-lg p-6">
               <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitor Comparison</h3>
               <div className="text-center py-8">
                 <div className="text-3xl font-bold text-gray-900 mb-2">
                   {results.comparison.competitiveScore || 'N/A'}/100
                 </div>
                 <p className="text-gray-600">Competitive Score</p>
                 <p className="text-sm text-gray-500 mt-4">
                   Detailed competitive analysis will be displayed here
                 </p>
               </div>
             </div>
           )}

           {/* Tab Content - AI Report */}
           {activeTab === 'report' && results?.aiReport && (
             <div className="bg-white border border-gray-200 rounded-lg p-6">
               <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Report</h3>
               <div className="bg-gray-50 p-4 rounded-md border max-h-96 overflow-y-auto">
                 <pre className="text-sm whitespace-pre-wrap">
                   {results.aiReport}
                 </pre>
               </div>
             </div>
           )}

           {/* Tab Content - SEMRush */}
           {activeTab === 'semrush' && (
             <div className="bg-white border border-gray-200 rounded-lg p-6">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-semibold text-gray-900">SEMRush Data</h3>
                 {currentProject && (
                   <button
                     onClick={() => setShowUploadModal(true)}
                     className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                   >
                     <Upload className="w-4 h-4" />
                     Upload Files
                   </button>
                 )}
               </div>

               {!currentProject ? (
                 <p className="text-gray-600 text-center py-8">
                   Please select a project to manage SEMRush data
                 </p>
               ) : !projectData?.reports || projectData.reports.length === 0 ? (
                 <div className="text-center py-8">
                   <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                   <p className="text-gray-600 mb-4">
                     No SEMRush reports uploaded yet
                   </p>
                   <p className="text-sm text-gray-500 mb-4">
                     Upload your SEMRush CSV and PDF files to enhance your SEO analysis
                   </p>
                   <button
                     onClick={() => setShowUploadModal(true)}
                     className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                   >
                     Upload First Report
                   </button>
                 </div>
               ) : (
                 <div className="space-y-6">
                   {/* Uploaded Files Summary */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                       <div className="text-2xl font-bold text-blue-900">
                         {projectData.reports.length}
                       </div>
                       <div className="text-sm text-blue-700">Total Reports</div>
                     </div>
                     <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                       <div className="text-2xl font-bold text-green-900">
                         {projectData.reports.filter(r => !r.is_competitor).length}
                       </div>
                       <div className="text-sm text-green-700">Main Domain</div>
                     </div>
                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                       <div className="text-2xl font-bold text-orange-900">
                         {projectData.reports.filter(r => r.is_competitor).length}
                       </div>
                       <div className="text-sm text-orange-700">Competitor Data</div>
                     </div>
                   </div>

                   {/* Files List */}
                   <div>
                     <h4 className="font-medium text-gray-900 mb-3">Uploaded Reports</h4>
                     <div className="space-y-2">
                       {projectData.reports.map((report, index) => (
                         <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                           <div className="flex-1">
                             <div className="font-medium text-sm">{report.filename}</div>
                             <div className="text-xs text-gray-600">
                               {report.report_type.replace('_', ' ')} • 
                               {report.is_competitor ? ' Competitor' : ' Main Domain'} • 
                               {new Date(report.created_at).toLocaleDateString()}
                             </div>
                           </div>
                           <div className="text-xs text-gray-500">
                             {report.filename.toLowerCase().endsWith('.pdf') ? 'PDF' : 'CSV'}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Data Preview */}
                   <div>
                     <h4 className="font-medium text-gray-900 mb-3">Data Status</h4>
                     <div className="bg-gray-50 border rounded-md p-4">
                       {projectData.reports.map((report, index) => {
                         let dataInfo = 'No data parsed';
                         try {
                           if (report.file_data) {
                             const data = JSON.parse(report.file_data);
                             if (Array.isArray(data)) {
                               dataInfo = `${data.length} rows of CSV data`;
                             } else if (data.type === 'pdf') {
                               dataInfo = `PDF file stored (${(data.size / 1024).toFixed(1)}KB)`;
                             } else {
                               dataInfo = 'Data stored successfully';
                             }
                           }
                         } catch (e) {
                           dataInfo = 'Data parsing error';
                         }
                         
                         return (
                           <div key={index} className="text-sm mb-2">
                             <strong>{report.filename}:</strong> {dataInfo}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}
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
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              
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

            {/* Bulk File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload SEMRush Reports</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag & Drop SEMRush Files Here
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Or click to browse • Supports CSV and PDF files
                </p>
                <input
                  type="file"
                  multiple
                  accept=".csv,.pdf"
                  onChange={(e) => handleFilesSelected(Array.from(e.target.files))}
                  className="hidden"
                  id="fileInput"
                />
                <label
                  htmlFor="fileInput"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer inline-block"
                >
                  Browse Files
                </label>
              </div>

              {/* Auto-detection Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Smart Detection:</strong> Report types are auto-detected from filenames. 
                  <br />• <strong>Gap Reports</strong> (keyword-gap, backlink-gap) automatically include both your domain + competitors
                  <br />• <strong>Single Domain Reports</strong> marked as "competitor" only if filename contains "competitor", "comp_", or "vs_"
                  <br />• Use keywords: "domain", "keyword-gap", "backlink-gap", "organic" for report types
                </p>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {selectedFiles.map((fileObj, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{fileObj.name}</div>
                          <div className="text-xs text-gray-600">
                            {fileObj.reportType.replace('_', ' ')} • {fileObj.isCompetitor ? 'Competitor' : 'Main Domain'}
                          </div>
                        </div>
                        <div className="ml-4">
                          {uploadProgress[fileObj.name] === 'uploading' && (
                            <div className="text-xs text-blue-600">Uploading...</div>
                          )}
                          {uploadProgress[fileObj.name] === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {uploadProgress[fileObj.name] === 'error' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={uploadAllFiles}
                  disabled={uploadLoading || selectedFiles.length === 0}
                  className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-green-400"
                >
                  {uploadLoading ? 'Uploading Files...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                    setUploadProgress({});
                  }}
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
