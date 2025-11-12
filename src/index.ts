#!/usr/bin/env bun

import { intro, outro, text, select, spinner, isCancel, cancel } from '@clack/prompts';
import { execSync, spawn } from 'child_process';
import { randomUUID } from 'crypto';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  dim: '\x1b[2m',
};

interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  path: string;
}

function checkTmux(): void {
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    console.error(`${colors.red}✖${colors.reset} tmux is not installed\n`);
    console.log('To install tmux:\n');

    const platform = process.platform;
    if (platform === 'darwin') {
      console.log('  macOS:');
      console.log('    brew install tmux\n');
    } else if (platform === 'linux') {
      console.log('  Ubuntu/Debian:');
      console.log('    sudo apt-get install tmux\n');
      console.log('  Fedora/RHEL:');
      console.log('    sudo dnf install tmux\n');
      console.log('  Arch:');
      console.log('    sudo pacman -S tmux\n');
    } else {
      console.log('  Please install tmux for your operating system\n');
    }

    process.exit(1);
  }
}

function getTmuxSessions(): TmuxSession[] {
  try {
    const output = execSync('tmux list-sessions -F "#{session_name}|#{session_windows}|#{session_attached}|#{session_path}"', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return output
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [name, windows, attached, path] = line.split('|');
        return {
          name,
          windows: parseInt(windows, 10),
          attached: attached === '1',
          path: path || '',
        };
      });
  } catch (error: any) {
    // No sessions exist or tmux server not running
    if (error.status === 1) {
      return [];
    }
    throw error;
  }
}

function generateLetterDesignation(index: number): string {
  if (index < 26) {
    return String.fromCharCode(97 + index); // a-z
  }
  // For more than 26 sessions: aa, ab, ac, etc.
  const first = String.fromCharCode(97 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(97 + (index % 26));
  return first + second;
}

function attachToSession(sessionName: string): void {
  const s = spinner();
  s.start(`Attaching to session: ${sessionName}`);

  // Small delay for visual feedback
  setTimeout(() => {
    s.stop(`Attaching to session: ${sessionName}`);

    // Hand over control to tmux
    const tmux = spawn('tmux', ['attach-session', '-t', sessionName], {
      stdio: 'inherit',
    });

    tmux.on('exit', (code) => {
      process.exit(code || 0);
    });
  }, 200);
}

function createSession(sessionName: string): void {
  const s = spinner();
  s.start(`Creating session: ${sessionName}`);

  setTimeout(() => {
    s.stop(`Creating session: ${sessionName}`);

    // Create and attach to new session
    const tmux = spawn('tmux', ['new-session', '-s', sessionName], {
      stdio: 'inherit',
    });

    tmux.on('exit', (code) => {
      process.exit(code || 0);
    });
  }, 200);
}

function killAllSessions(sessions: TmuxSession[]): void {
  const s = spinner();
  s.start('Killing all sessions...');

  try {
    sessions.forEach(session => {
      execSync(`tmux kill-session -t "${session.name}"`, { stdio: 'pipe' });
    });
    s.stop(`${colors.green}✓${colors.reset} Killed ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`);
  } catch (error: any) {
    s.stop(`${colors.red}✖${colors.reset} Error killing sessions`);
    throw error;
  }
}

async function main() {
  console.clear();

  checkTmux();

  intro(`${colors.cyan}tmux session manager${colors.reset}`);

  const showAll = process.argv.includes('--all');
  const currentDir = process.cwd();

  let sessions = getTmuxSessions();

  // Filter sessions by current directory unless --all flag is passed
  if (!showAll) {
    sessions = sessions.filter(session => {
      // Check if session path is current directory or a subdirectory
      return session.path === currentDir || session.path.startsWith(currentDir + '/');
    });
  }

  if (sessions.length === 0) {
    console.log(`${colors.dim}No active tmux sessions${colors.reset}\n`);

    const input = await text({
      message: 'Enter session name (or press Enter for UUID):',
      placeholder: 'my-session',
      validate: (value) => {
        if (value.length === 1 && /^[a-z]$/i.test(value)) {
          return 'Session name must be empty (for UUID) or 2+ characters';
        }
      },
    });

    if (isCancel(input)) {
      cancel('Operation cancelled');
      process.exit(0);
    }

    const sessionName = (typeof input === 'string' && input.trim()) || randomUUID();
    outro(`${colors.green}✓${colors.reset} Creating new session`);
    createSession(sessionName);
    return;
  }

  // Display sessions with letter designations
  console.log(`${colors.dim}Active sessions:${colors.reset}\n`);

  const letterMap = new Map<string, string>();

  sessions.forEach((session, index) => {
    const letter = generateLetterDesignation(index);
    letterMap.set(letter, session.name);

    const attachedIndicator = session.attached ? `${colors.green}●${colors.reset}` : `${colors.dim}○${colors.reset}`;
    const windowText = `${session.windows} window${session.windows !== 1 ? 's' : ''}`;

    console.log(
      `  ${colors.cyan}${letter}${colors.reset}) ${session.name} ${attachedIndicator} ${colors.dim}(${windowText})${colors.reset}`
    );
  });

  console.log('');

  const input = await text({
    message: 'Select session (letter), create new (name), type "reset" to kill all, or press Enter for UUID:',
    placeholder: 'a or new-session-name or reset',
    validate: (value) => {
      if (!value || typeof value !== 'string') {
        return; // Allow empty input
      }
      const val = value.toString().trim().toLowerCase();
      if (val.length === 1 && !letterMap.has(val)) {
        return `Invalid session letter. Choose from: ${Array.from(letterMap.keys()).join(', ')}`;
      }
    },
  });

  if (isCancel(input)) {
    cancel('Operation cancelled');
    process.exit(0);
  }

  const value = typeof input === 'string' ? input.trim() : '';

  if (value.toLowerCase() === 'reset') {
    // Kill all sessions from the filtered list
    killAllSessions(sessions);
    outro(`${colors.green}✓${colors.reset} All sessions cleared`);
    process.exit(0);
  } else if (value === '') {
    // Create new session with UUID
    const sessionName = randomUUID();
    outro(`${colors.green}✓${colors.reset} Creating new session`);
    createSession(sessionName);
  } else if (value.length === 1) {
    // Attach to existing session
    const sessionName = letterMap.get(value.toLowerCase());
    if (sessionName) {
      outro(`${colors.green}✓${colors.reset} Attaching to session`);
      attachToSession(sessionName);
    }
  } else {
    // Create new session with provided name
    outro(`${colors.green}✓${colors.reset} Creating new session`);
    createSession(value);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Error:${colors.reset}`, error.message);
  process.exit(1);
});
