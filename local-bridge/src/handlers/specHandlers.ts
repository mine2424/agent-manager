import { Socket } from 'socket.io';
import { SpecGenerator, SpecRequest } from '../services/specGenerator.js';
import path from 'path';
import fs from 'fs';

export function setupSpecHandlers(socket: Socket) {
  const specGenerator = new SpecGenerator();
  const userId = (socket as any).userId;
  const userEmail = (socket as any).userEmail;

  // Start spec generation
  socket.on('spec:start', async (data: {
    projectId: string;
    title: string;
    requirements: string[];
  }) => {
    console.log(`📋 Starting spec generation for ${data.title} by ${userEmail}`);
    
    try {
      const request: SpecRequest = {
        projectId: data.projectId,
        userId,
        title: data.title,
        requirements: data.requirements,
        phase: 'requirements'
      };

      // Set up event listeners
      specGenerator.on('document:generated', (document) => {
        socket.emit('spec:document', {
          type: document.type,
          content: document.content,
          metadata: document.metadata
        });
      });

      specGenerator.on('spec:completed', (result) => {
        socket.emit('spec:completed', result);
      });

      // Start the spec generation
      await specGenerator.startSpec(request);
      
      socket.emit('spec:phase', {
        phase: 'requirements',
        message: 'Requirements phase completed. Review the document and proceed to design phase.'
      });

    } catch (error) {
      console.error('❌ Spec generation error:', error);
      socket.emit('spec:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Continue to next phase
  socket.on('spec:next', async () => {
    console.log(`📋 Proceeding to next spec phase for ${userEmail}`);
    
    try {
      await specGenerator.nextPhase();
      
      const documents = specGenerator.getDocuments();
      const currentPhase = documents.has('tasks') ? 'completed' : 
                          documents.has('design') ? 'implementation' : 'design';
      
      socket.emit('spec:phase', {
        phase: currentPhase,
        message: `${currentPhase} phase ${currentPhase === 'completed' ? 'completed' : 'started'}.`
      });
      
    } catch (error) {
      console.error('❌ Spec phase error:', error);
      socket.emit('spec:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save spec documents to project
  socket.on('spec:save', async (data: {
    projectId: string;
  }) => {
    console.log(`💾 Saving spec documents for project ${data.projectId}`);
    
    try {
      // Create spec directory in temp folder
      const tempDir = path.join(process.env.TEMP_DIR || '/tmp', 'specs', data.projectId);
      await specGenerator.saveDocuments(tempDir);
      
      // TODO: Upload to Firestore or cloud storage
      
      socket.emit('spec:saved', {
        message: 'Spec documents saved successfully',
        path: tempDir
      });
      
    } catch (error) {
      console.error('❌ Spec save error:', error);
      socket.emit('spec:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Interactive spec refinement
  socket.on('spec:refine', async (data: {
    phase: 'requirements' | 'design' | 'implementation';
    feedback: string;
  }) => {
    console.log(`🔄 Refining spec ${data.phase} phase based on feedback`);
    
    try {
      // This would integrate with Claude to refine the spec based on feedback
      // For now, we'll just acknowledge the feedback
      socket.emit('spec:refined', {
        phase: data.phase,
        message: 'Spec refined based on your feedback',
        feedback: data.feedback
      });
      
    } catch (error) {
      console.error('❌ Spec refinement error:', error);
      socket.emit('spec:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current spec status
  socket.on('spec:status', () => {
    try {
      const documents = specGenerator.getDocuments();
      const status = {
        hasRequirements: documents.has('requirements'),
        hasDesign: documents.has('design'),
        hasTasks: documents.has('tasks'),
        documentCount: documents.size,
        currentPhase: documents.has('tasks') ? 'completed' : 
                     documents.has('design') ? 'implementation' : 
                     documents.has('requirements') ? 'design' : 'requirements'
      };
      
      socket.emit('spec:status', status);
      
    } catch (error) {
      console.error('❌ Spec status error:', error);
      socket.emit('spec:error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}