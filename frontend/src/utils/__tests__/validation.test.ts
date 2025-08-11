import { describe, it, expect } from 'vitest'
import {
  validate,
  ValidationSchemas,
  Sanitizers,
  ValidationPatterns,
} from '../validation'

describe('Validation Utilities', () => {
  describe('validate', () => {
    it('should validate required fields', () => {
      const schema = {
        name: { required: true },
      }
      
      const result1 = validate({ name: 'Test' }, schema)
      expect(result1.isValid).toBe(true)
      expect(result1.errors).toEqual({})
      
      const result2 = validate({ name: '' }, schema)
      expect(result2.isValid).toBe(false)
      expect(result2.errors.name).toBe('このフィールドは必須です')
    })

    it('should validate min and max length', () => {
      const schema = {
        name: { minLength: 3, maxLength: 10 },
      }
      
      const result1 = validate({ name: 'Test' }, schema)
      expect(result1.isValid).toBe(true)
      
      const result2 = validate({ name: 'Te' }, schema)
      expect(result2.isValid).toBe(false)
      expect(result2.errors.name).toBe('3文字以上入力してください')
      
      const result3 = validate({ name: 'This is too long' }, schema)
      expect(result3.isValid).toBe(false)
      expect(result3.errors.name).toBe('10文字以内で入力してください')
    })

    it('should validate patterns', () => {
      const schema = {
        email: { pattern: ValidationPatterns.email },
      }
      
      const result1 = validate({ email: 'test@example.com' }, schema)
      expect(result1.isValid).toBe(true)
      
      const result2 = validate({ email: 'invalid-email' }, schema)
      expect(result2.isValid).toBe(false)
      expect(result2.errors.email).toBe('正しい形式で入力してください')
    })

    it('should validate custom validators', () => {
      const schema = {
        age: {
          custom: (value: number) => {
            if (value < 18) return '18歳以上である必要があります'
            return null
          },
        },
      }
      
      const result1 = validate({ age: 20 }, schema)
      expect(result1.isValid).toBe(true)
      
      const result2 = validate({ age: 16 }, schema)
      expect(result2.isValid).toBe(false)
      expect(result2.errors.age).toBe('18歳以上である必要があります')
    })
  })

  describe('ValidationPatterns', () => {
    it('should validate email pattern', () => {
      expect(ValidationPatterns.email.test('test@example.com')).toBe(true)
      expect(ValidationPatterns.email.test('user.name+tag@example.co.jp')).toBe(true)
      expect(ValidationPatterns.email.test('invalid')).toBe(false)
      expect(ValidationPatterns.email.test('@example.com')).toBe(false)
      expect(ValidationPatterns.email.test('test@')).toBe(false)
    })

    it('should validate URL pattern', () => {
      expect(ValidationPatterns.url.test('https://example.com')).toBe(true)
      expect(ValidationPatterns.url.test('http://localhost:3000')).toBe(true)
      expect(ValidationPatterns.url.test('https://example.com/path?query=1')).toBe(true)
      expect(ValidationPatterns.url.test('not-a-url')).toBe(false)
      expect(ValidationPatterns.url.test('ftp://example.com')).toBe(false)
    })

    it('should validate project name pattern', () => {
      expect(ValidationPatterns.projectName.test('My Project')).toBe(true)
      expect(ValidationPatterns.projectName.test('プロジェクト123')).toBe(true)
      expect(ValidationPatterns.projectName.test('project-name_123')).toBe(true)
      expect(ValidationPatterns.projectName.test('project@name')).toBe(false)
      expect(ValidationPatterns.projectName.test('project/name')).toBe(false)
    })

    it('should validate file name pattern', () => {
      expect(ValidationPatterns.fileName.test('file.txt')).toBe(true)
      expect(ValidationPatterns.fileName.test('my-file_123.js')).toBe(true)
      expect(ValidationPatterns.fileName.test('file name.txt')).toBe(false)
      expect(ValidationPatterns.fileName.test('file/name.txt')).toBe(false)
    })

    it('should validate file path pattern', () => {
      expect(ValidationPatterns.filePath.test('src/components/App.tsx')).toBe(true)
      expect(ValidationPatterns.filePath.test('file.txt')).toBe(true)
      expect(ValidationPatterns.filePath.test('path/to/file-name.js')).toBe(true)
      expect(ValidationPatterns.filePath.test('../file.txt')).toBe(false)
      expect(ValidationPatterns.filePath.test('path with spaces/file.txt')).toBe(false)
    })
  })

  describe('Sanitizers', () => {
    describe('sanitizeFilePath', () => {
      it('should remove directory traversal attempts', () => {
        expect(Sanitizers.sanitizeFilePath('../../../etc/passwd')).toBe('etc/passwd')
        expect(Sanitizers.sanitizeFilePath('path/../file.txt')).toBe('path/file.txt')
      })

      it('should remove leading slashes', () => {
        expect(Sanitizers.sanitizeFilePath('/absolute/path')).toBe('absolute/path')
        expect(Sanitizers.sanitizeFilePath('///multiple/slashes')).toBe('multiple/slashes')
      })

      it('should remove dangerous characters', () => {
        expect(Sanitizers.sanitizeFilePath('file<>:"|?*.txt')).toBe('file.txt')
        expect(Sanitizers.sanitizeFilePath('path\\to\\file')).toBe('path/to/file')
      })

      it('should normalize multiple slashes', () => {
        expect(Sanitizers.sanitizeFilePath('path//to///file')).toBe('path/to/file')
      })
    })

    describe('sanitizeFirestorePath', () => {
      it('should replace slashes and dots', () => {
        expect(Sanitizers.sanitizeFirestorePath('path/to/file.txt')).toBe('path__to__file_dot_txt')
      })

      it('should remove brackets and special characters', () => {
        expect(Sanitizers.sanitizeFirestorePath('file[1].array[0]')).toBe('file1_dot_array0')
        expect(Sanitizers.sanitizeFirestorePath('special@#$%chars')).toBe('special____chars')
      })

      it('should limit path length', () => {
        const longPath = 'a'.repeat(2000)
        const result = Sanitizers.sanitizeFirestorePath(longPath)
        expect(result.length).toBe(1500)
      })
    })

    describe('escapeHtml', () => {
      it('should escape HTML special characters', () => {
        expect(Sanitizers.escapeHtml('<script>alert("XSS")</script>'))
          .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;')
        expect(Sanitizers.escapeHtml(`<img src="x" onerror='alert(1)'>`))
          .toBe('&lt;img src=&quot;x&quot; onerror=&#x27;alert(1)&#x27;&gt;')
        expect(Sanitizers.escapeHtml('normal & text'))
          .toBe('normal &amp; text')
      })
    })

    describe('sanitizeProjectName', () => {
      it('should trim and limit length', () => {
        expect(Sanitizers.sanitizeProjectName('  Project Name  ')).toBe('Project Name')
        expect(Sanitizers.sanitizeProjectName('a'.repeat(150))).toBe('a'.repeat(100))
      })

      it('should normalize whitespace', () => {
        expect(Sanitizers.sanitizeProjectName('Project   Name')).toBe('Project Name')
        expect(Sanitizers.sanitizeProjectName('Multiple\n\nSpaces')).toBe('Multiple Spaces')
      })
    })

    describe('sanitizeCommand', () => {
      it('should trim and limit length', () => {
        expect(Sanitizers.sanitizeCommand('  command  ')).toBe('command')
        expect(Sanitizers.sanitizeCommand('a'.repeat(6000))).toBe('a'.repeat(5000))
      })

      it('should remove null bytes', () => {
        expect(Sanitizers.sanitizeCommand('command\0with\0null')).toBe('commandwithnull')
      })
    })
  })

  describe('ValidationSchemas', () => {
    describe('project schema', () => {
      it('should validate project data', () => {
        const validProject = {
          name: 'My Project',
          description: 'A test project',
          githubUrl: 'https://github.com/user/repo',
        }
        
        const result = validate(validProject, ValidationSchemas.project)
        expect(result.isValid).toBe(true)
      })

      it('should reject invalid project names', () => {
        const invalidProject = {
          name: 'Project@Name#Invalid',
          description: 'A test project',
        }
        
        const result = validate(invalidProject, ValidationSchemas.project)
        expect(result.isValid).toBe(false)
        expect(result.errors.name).toBeDefined()
      })

      it('should reject long descriptions', () => {
        const project = {
          name: 'Valid Name',
          description: 'a'.repeat(501),
        }
        
        const result = validate(project, ValidationSchemas.project)
        expect(result.isValid).toBe(false)
        expect(result.errors.description).toBe('500文字以内で入力してください')
      })
    })

    describe('file schema', () => {
      it('should validate file data', () => {
        const validFile = {
          name: 'test-file.js',
          path: 'src/components/test-file.js',
          content: 'console.log("Hello")',
        }
        
        const result = validate(validFile, ValidationSchemas.file)
        expect(result.isValid).toBe(true)
      })

      it('should reject paths with directory traversal', () => {
        const file = {
          name: 'file.txt',
          path: '../../../etc/passwd',
          content: 'content',
        }
        
        const result = validate(file, ValidationSchemas.file)
        expect(result.isValid).toBe(false)
        expect(result.errors.path).toBeTruthy() // Pattern or custom validation will catch this
      })

      it('should reject paths starting with /', () => {
        const file = {
          name: 'file.txt',
          path: '/absolute/path',
          content: 'content',
        }
        
        const result = validate(file, ValidationSchemas.file)
        expect(result.isValid).toBe(false)
        expect(result.errors.path).toBe('パスは"/"で始めることはできません')
      })

      it('should reject large files', () => {
        const file = {
          name: 'large.txt',
          path: 'large.txt',
          content: 'a'.repeat(11 * 1024 * 1024), // 11MB
        }
        
        const result = validate(file, ValidationSchemas.file)
        expect(result.isValid).toBe(false)
        expect(result.errors.content).toBe('ファイルサイズは10MBまでです')
      })
    })

    describe('execution schema', () => {
      it('should validate execution commands', () => {
        const validCommand = {
          command: 'npm run build',
        }
        
        const result = validate(validCommand, ValidationSchemas.execution)
        expect(result.isValid).toBe(true)
      })

      it('should reject dangerous commands', () => {
        const dangerousCommands = [
          { command: 'rm -rf /' },
          { command: 'sudo apt-get install' },
          { command: 'chmod 777 /etc/passwd' },
          { command: 'eval("malicious code")' },
          { command: 'exec("dangerous")' },
        ]
        
        dangerousCommands.forEach(cmd => {
          const result = validate(cmd, ValidationSchemas.execution)
          expect(result.isValid).toBe(false)
          expect(result.errors.command).toBe('安全でないコマンドが検出されました')
        })
      })

      it('should enforce command length limits', () => {
        const longCommand = {
          command: 'echo ' + 'a'.repeat(5001),
        }
        
        const result = validate(longCommand, ValidationSchemas.execution)
        expect(result.isValid).toBe(false)
        expect(result.errors.command).toBe('5000文字以内で入力してください')
      })
    })

    describe('user schema', () => {
      it('should validate user data', () => {
        const validUser = {
          email: 'user@example.com',
          displayName: 'Test User',
        }
        
        const result = validate(validUser, ValidationSchemas.user)
        expect(result.isValid).toBe(true)
      })

      it('should require valid email', () => {
        const invalidUser = {
          email: 'not-an-email',
          displayName: 'Test User',
        }
        
        const result = validate(invalidUser, ValidationSchemas.user)
        expect(result.isValid).toBe(false)
        expect(result.errors.email).toBe('有効なメールアドレスを入力してください')
      })

      it('should enforce display name length', () => {
        const user = {
          email: 'user@example.com',
          displayName: 'a'.repeat(51),
        }
        
        const result = validate(user, ValidationSchemas.user)
        expect(result.isValid).toBe(false)
        expect(result.errors.displayName).toBe('50文字以内で入力してください')
      })
    })
  })
})