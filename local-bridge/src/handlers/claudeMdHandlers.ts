import { Socket } from 'socket.io';
import { z } from 'zod';
import { validateSocketData } from '../middleware/validation';
import { claudeMdGenerator } from '../services/claudeMdGenerator';
import { auditLogger } from '../services/auditLogger';
import { logger } from '../services/logger';

// Validation schemas
const generateClaudeMdSchema = z.object({
  projectId: z.string().min(1).max(100),
  customInstructions: z.string().max(2000).optional()
});

const updateClaudeMdSchema = z.object({
  projectId: z.string().min(1).max(100),
  changeType: z.enum(['file_added', 'file_modified', 'file_deleted', 'execution_completed', 'spec_generated'])
});

/**
 * Handle CLAUDE.md generation request
 */
export const handleGenerateClaudeMd = async (socket: Socket, data: unknown) => {
  try {
    const validatedData = validateSocketData(data, generateClaudeMdSchema);
    const userId = socket.data.userId;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    logger.info('Generating CLAUDE.md', { userId, projectId: validatedData.projectId });

    // Log the action
    await auditLogger.log({
      userId,
      eventType: 'claude_md',
      action: 'generate',
      resource: validatedData.projectId,
      details: { customInstructions: validatedData.customInstructions }
    });

    // Generate CLAUDE.md
    const content = await claudeMdGenerator.generateClaudeMd(
      validatedData.projectId,
      userId
    );

    // Emit success with content
    socket.emit('claude_md:generated', {
      projectId: validatedData.projectId,
      content,
      timestamp: Date.now()
    });

    logger.info('CLAUDE.md generated successfully', { 
      userId, 
      projectId: validatedData.projectId,
      contentLength: content.length 
    });

  } catch (error) {
    logger.error('Failed to generate CLAUDE.md', { error });
    
    socket.emit('claude_md:error', {
      message: error instanceof Error ? error.message : 'Failed to generate CLAUDE.md',
      code: 'CLAUDE_MD_GENERATION_ERROR'
    });
  }
};

/**
 * Handle CLAUDE.md update request
 */
export const handleUpdateClaudeMd = async (socket: Socket, data: unknown) => {
  try {
    const validatedData = validateSocketData(data, updateClaudeMdSchema);
    const userId = socket.data.userId;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    logger.info('Updating CLAUDE.md', { 
      userId, 
      projectId: validatedData.projectId,
      changeType: validatedData.changeType 
    });

    // Log the action
    await auditLogger.log({
      userId,
      eventType: 'claude_md',
      action: 'update',
      resource: validatedData.projectId,
      details: { changeType: validatedData.changeType }
    });

    // Update CLAUDE.md
    await claudeMdGenerator.updateClaudeMd(
      validatedData.projectId,
      userId,
      validatedData.changeType
    );

    // Emit success
    socket.emit('claude_md:updated', {
      projectId: validatedData.projectId,
      changeType: validatedData.changeType,
      timestamp: Date.now()
    });

    logger.info('CLAUDE.md updated successfully', { 
      userId, 
      projectId: validatedData.projectId 
    });

  } catch (error) {
    logger.error('Failed to update CLAUDE.md', { error });
    
    socket.emit('claude_md:error', {
      message: error instanceof Error ? error.message : 'Failed to update CLAUDE.md',
      code: 'CLAUDE_MD_UPDATE_ERROR'
    });
  }
};

/**
 * Register CLAUDE.md handlers
 */
export const registerClaudeMdHandlers = (socket: Socket) => {
  socket.on('claude_md:generate', (data) => handleGenerateClaudeMd(socket, data));
  socket.on('claude_md:update', (data) => handleUpdateClaudeMd(socket, data));
  
  logger.debug('CLAUDE.md handlers registered', { socketId: socket.id });
};