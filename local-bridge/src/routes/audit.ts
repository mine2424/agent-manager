import { Router, Request, Response } from 'express';
import { auditLogger, AuditEventType } from '../services/auditLogger.js';
import { expressAuthMiddleware as authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get recent audit logs
router.get('/recent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await auditLogger.getRecentLogs(limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// Search audit logs
router.post('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType, userId, startDate, endDate, severity } = req.body;
    
    const criteria: any = {};
    
    if (eventType) {
      criteria.eventType = eventType as AuditEventType;
    }
    
    if (userId) {
      criteria.userId = userId;
    }
    
    if (startDate) {
      criteria.startDate = new Date(startDate);
    }
    
    if (endDate) {
      criteria.endDate = new Date(endDate);
    }
    
    if (severity) {
      criteria.severity = severity;
    }
    
    const logs = await auditLogger.searchLogs(criteria);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      criteria
    });
  } catch (error) {
    console.error('Error searching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search audit logs'
    });
  }
});

// Get audit log statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await auditLogger.getRecentLogs(1000);
    
    // Calculate statistics
    const stats = {
      totalEvents: logs.length,
      byEventType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      failedEvents: 0,
      uniqueUsers: new Set<string>(),
      timeRange: {
        earliest: logs[0]?.timestamp,
        latest: logs[logs.length - 1]?.timestamp
      }
    };
    
    logs.forEach(log => {
      // Count by event type
      stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      
      // Count failed events
      if (!log.success) {
        stats.failedEvents++;
      }
      
      // Track unique users
      if (log.userId) {
        stats.uniqueUsers.add(log.userId);
      }
    });
    
    res.json({
      success: true,
      data: {
        ...stats,
        uniqueUsers: stats.uniqueUsers.size
      }
    });
  } catch (error) {
    console.error('Error calculating audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate audit statistics'
    });
  }
});

// Cleanup old logs (admin only)
router.post('/cleanup', authMiddleware, async (req: Request, res: Response) => {
  try {
    // TODO: Add admin check
    const daysToKeep = parseInt(req.body.daysToKeep) || 90;
    
    auditLogger.cleanupOldLogs(daysToKeep);
    
    res.json({
      success: true,
      message: `Cleaned up logs older than ${daysToKeep} days`
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup audit logs'
    });
  }
});

export default router;