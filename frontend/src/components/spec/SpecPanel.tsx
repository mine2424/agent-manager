import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SpecPanelProps {
  socket: Socket | null;
  projectId: string;
}

interface SpecDocument {
  type: 'requirements' | 'design' | 'tasks';
  content: string;
  metadata: {
    title: string;
    generatedAt: string;
    phase: string;
    version: string;
  };
}

interface SpecStatus {
  hasRequirements: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  documentCount: number;
  currentPhase: string;
}

export const SpecPanel: React.FC<SpecPanelProps> = ({ socket, projectId }) => {
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [documents, setDocuments] = useState<SpecDocument[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('requirements');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'requirements' | 'design' | 'tasks'>('requirements');
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for spec events
    socket.on('spec:document', (document: SpecDocument) => {
      setDocuments(prev => [...prev.filter(d => d.type !== document.type), document]);
      setIsGenerating(false);
    });

    socket.on('spec:phase', (data: { phase: string; message: string }) => {
      setCurrentPhase(data.phase);
      console.log(data.message);
    });

    socket.on('spec:error', (data: { error: string }) => {
      console.error('Spec error:', data.error);
      setIsGenerating(false);
    });

    socket.on('spec:completed', (data: any) => {
      console.log('Spec generation completed:', data);
      setIsGenerating(false);
    });

    socket.on('spec:status', (status: SpecStatus) => {
      setCurrentPhase(status.currentPhase);
    });

    return () => {
      socket.off('spec:document');
      socket.off('spec:phase');
      socket.off('spec:error');
      socket.off('spec:completed');
      socket.off('spec:status');
    };
  }, [socket]);

  const handleStartSpec = () => {
    if (!socket || !title || requirements.filter(r => r).length === 0) return;

    setIsGenerating(true);
    socket.emit('spec:start', {
      projectId,
      title,
      requirements: requirements.filter(r => r.trim())
    });
  };

  const handleNextPhase = () => {
    if (!socket) return;
    setIsGenerating(true);
    socket.emit('spec:next');
  };

  const handleAddRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const handleUpdateRequirement = (index: number, value: string) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleRefineSpec = () => {
    if (!socket || !feedback) return;
    
    socket.emit('spec:refine', {
      phase: currentPhase as any,
      feedback
    });
    setFeedback('');
    setShowFeedback(false);
  };

  const handleSaveDocuments = () => {
    if (!socket) return;
    socket.emit('spec:save', { projectId });
  };

  const getDocumentByType = (type: 'requirements' | 'design' | 'tasks') => {
    return documents.find(d => d.type === type);
  };

  const renderMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h2 className="text-xl font-semibold mb-4">Spec-Driven Development</h2>
        
        {/* Input Section */}
        {!documents.length && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Feature Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., User Authentication System"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Requirements (4-line minimal input)</label>
              {requirements.map((req, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => handleUpdateRequirement(index, e.target.value)}
                    placeholder={`Requirement ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleRemoveRequirement(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-r-md"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddRequirement}
                className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                + Add Requirement
              </button>
            </div>
            
            <button
              onClick={handleStartSpec}
              disabled={!title || requirements.filter(r => r).length === 0 || isGenerating}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Start Spec Generation'}
            </button>
          </div>
        )}
        
        {/* Phase Progress */}
        {documents.length > 0 && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${documents.some(d => d.type === 'requirements') ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className="text-sm">Requirements</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${documents.some(d => d.type === 'design') ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className="text-sm">Design</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${documents.some(d => d.type === 'tasks') ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className="text-sm">Tasks</span>
            </div>
          </div>
        )}
      </div>

      {/* Document Tabs */}
      {documents.length > 0 && (
        <div className="border-b border-gray-700">
          <div className="flex space-x-1 p-2">
            {documents.map(doc => (
              <button
                key={doc.type}
                onClick={() => setActiveTab(doc.type)}
                className={`px-4 py-2 rounded-t-md ${
                  activeTab === doc.type
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Content */}
      <div className="flex-1 overflow-auto p-4">
        {documents.length > 0 ? (
          <div className="prose prose-invert max-w-none">
            {renderMarkdown(getDocumentByType(activeTab)?.content || '')}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <p>Enter feature details above to start spec generation</p>
            <p className="text-sm mt-2">Following Kiro's spec-driven development methodology</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      {documents.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {currentPhase !== 'completed' && (
                <button
                  onClick={handleNextPhase}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {isGenerating ? 'Processing...' : 'Next Phase →'}
                </button>
              )}
              
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Refine Spec
              </button>
              
              <button
                onClick={handleSaveDocuments}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md"
              >
                Save Documents
              </button>
            </div>
            
            <div className="text-sm text-gray-400">
              Current Phase: <span className="font-semibold">{currentPhase}</span>
            </div>
          </div>
          
          {/* Feedback Section */}
          {showFeedback && (
            <div className="mt-4 space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback to refine the spec..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                onClick={handleRefineSpec}
                disabled={!feedback}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};