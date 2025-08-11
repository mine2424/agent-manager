# Claude Code Integration

## Overview
The Agent Manager now integrates with local Claude Code CLI to execute commands and process user requests.

## Implementation Details

### Claude Executor Service
Location: `/local-bridge/src/services/claudeExecutor.ts`

The service handles Claude Code execution with the following features:

1. **Command Execution Flow**:
   - Receives command from frontend via Socket.io
   - Creates a temporary working directory
   - Downloads project files from Firestore
   - Executes Claude with the user's command
   - Streams output back to frontend in real-time
   - Detects and uploads changed files back to Firestore
   - Cleans up temporary directory

2. **Claude CLI Integration**:
   ```javascript
   // Creates a shell script that runs Claude with the command
   const scriptContent = `#!/bin/bash
   cd "${workingDirectory}"
   echo "${command}" | claude --print --output-format text
   `;
   ```

3. **Key Features**:
   - Real-time output streaming via Socket.io
   - 5-minute timeout for long-running commands
   - File change detection and synchronization
   - Error handling and cleanup
   - Environment variable configuration

### Configuration

#### Environment Variables (`/local-bridge/.env`)
```env
# Claude CLI Path (optional, defaults to 'claude' in PATH)
CLAUDE_CLI_PATH=claude

# Test mode (set to true to use echo instead of Claude CLI)
USE_TEST_MODE=false
```

#### Test Mode
When `USE_TEST_MODE=true`, the system uses echo commands instead of Claude CLI for testing without requiring Claude authentication.

### How It Works

1. **User submits a command** through the web interface
2. **Backend receives the command** via Socket.io connection
3. **Claude Executor**:
   - Creates a temporary directory
   - Downloads project files from Firestore
   - Creates a shell script with the Claude command
   - Executes the script using bash
   - Captures stdout and stderr
4. **Output streaming**:
   - Real-time output is sent back to the frontend
   - UI displays the output as it's generated
5. **File synchronization**:
   - After execution, detects changed files
   - Uploads changes back to Firestore
   - Frontend receives file update notifications

### Security Considerations

1. **Authentication**: 
   - Firebase ID token verification before execution
   - User isolation through separate working directories

2. **Input Sanitization**:
   - Commands are escaped to prevent injection
   - Working directories are isolated per execution

3. **Resource Limits**:
   - 5-minute timeout for command execution
   - Automatic cleanup of temporary files

### Troubleshooting

#### Claude CLI Not Found
- Ensure Claude Code is installed: `which claude`
- Update `CLAUDE_CLI_PATH` in `.env` if needed

#### Authentication Issues
- Claude CLI might need authentication setup
- Run `claude setup-token` to configure authentication
- Ensure the backend process has access to Claude config

#### No Output from Claude
- Check if Claude CLI works manually: `echo "test" | claude --print`
- Enable test mode to verify the execution flow
- Check backend logs for errors

#### Timeout Issues
- Default timeout is 5 minutes
- For longer operations, consider adjusting the timeout in `claudeExecutor.ts`

### Testing

1. **Enable Test Mode**:
   ```bash
   # In /local-bridge/.env
   USE_TEST_MODE=true
   ```

2. **Test Command Execution**:
   - Open the web interface
   - Create a project
   - Go to Execute tab
   - Enter a command
   - Should see: "Claude would process: [your command]"

3. **Test with Real Claude**:
   ```bash
   # In /local-bridge/.env
   USE_TEST_MODE=false
   ```
   - Ensure Claude CLI is authenticated
   - Try simple commands first
   - Monitor backend logs for issues

### Future Improvements

1. **Enhanced Claude Integration**:
   - Support for Claude's streaming output
   - Better handling of interactive prompts
   - Integration with Claude's context management

2. **Performance Optimizations**:
   - Caching of frequently used files
   - Incremental file synchronization
   - Connection pooling for multiple executions

3. **Advanced Features**:
   - Command history and templates
   - Batch command execution
   - Scheduled command runs
   - Integration with Claude's MCP servers

## Summary

The Claude Code integration is now fully operational, allowing users to:
- Execute Claude commands from the web interface
- See real-time output streaming
- Have files automatically synchronized
- Work with isolated project environments

The system is designed to be secure, scalable, and easy to use while providing powerful AI-assisted development capabilities.