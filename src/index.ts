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

interface ZmxSession {
  name: string;
}

function isZmxInstalled(): boolean {
  try {
    execSync('which zmx', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function showManualInstallInstructions(): void {
  console.log('\nTo install zmx:\n');
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    const archStr = arch === 'arm64' ? 'aarch64' : 'x86_64';
    console.log('  Download from:');
    console.log(`    https://zmx.sh/a/zmx-0.0.2-macos-${archStr}.tar.gz\n`);
    console.log('  Then extract and move to your PATH:');
    console.log(`    tar -xzf zmx-0.0.2-macos-${archStr}.tar.gz`);
    console.log('    mv zmx ~/.local/bin/  # or /usr/local/bin/\n');
  } else if (platform === 'linux') {
    const archStr = arch === 'arm64' ? 'aarch64' : 'x86_64';
    console.log('  Download from:');
    console.log(`    https://zmx.sh/a/zmx-0.0.2-linux-${archStr}.tar.gz\n`);
    console.log('  Then extract and move to your PATH:');
    console.log(`    tar -xzf zmx-0.0.2-linux-${archStr}.tar.gz`);
    console.log('    mv zmx ~/.local/bin/  # or /usr/local/bin/\n');
  } else {
    console.log('  Please install zmx for your operating system');
    console.log('  See: https://github.com/neurosnap/zmx\n');
  }
}

async function ensureZmx(): Promise<void> {
  if (isZmxInstalled()) {
    return;
  }

  console.error(`${colors.red}✖${colors.reset} zmx is not installed\n`);
  showManualInstallInstructions();
  process.exit(1);
}

function getZmxSessions(): ZmxSession[] {
  try {
    const output = execSync('zmx list', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const trimmed = output.trim();

    // zmx outputs "no sessions found in /tmp/zmx" when empty
    if (trimmed.startsWith('no sessions found')) {
      return [];
    }

    const lines = trimmed.split('\n');

    // Parse session names from zmx list output format:
    // session_name=VALUE    pid=VALUE       clients=VALUE
    return lines
      .filter(line => line.length > 0)
      .map(line => {
        const match = line.match(/session_name=(\S+)/);
        return {
          name: match ? match[1] : line.trim(),
        };
      });
  } catch (error: any) {
    // No sessions exist or zmx not running
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

    // Hand over control to zmx
    const zmx = spawn('zmx', ['attach', sessionName], {
      stdio: 'inherit',
    });

    zmx.on('exit', (code) => {
      process.exit(code || 0);
    });
  }, 200);
}

function createSession(sessionName: string): void {
  const s = spinner();
  s.start(`Creating session: ${sessionName}`);

  setTimeout(() => {
    s.stop(`Creating session: ${sessionName}`);

    // In zmx, attach creates a new session if it doesn't exist
    const zmx = spawn('zmx', ['attach', sessionName], {
      stdio: 'inherit',
    });

    zmx.on('exit', (code) => {
      process.exit(code || 0);
    });
  }, 200);
}

function killAllSessions(sessions: ZmxSession[]): void {
  const s = spinner();
  s.start('Killing all sessions...');

  try {
    sessions.forEach(session => {
      execSync(`zmx kill "${session.name}"`, { stdio: 'pipe' });
    });
    s.stop(`${colors.green}✓${colors.reset} Killed ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`);
  } catch (error: any) {
    s.stop(`${colors.red}✖${colors.reset} Error killing sessions`);
    throw error;
  }
}

async function main() {
  console.clear();

  await ensureZmx();

  intro(`${colors.cyan}poof${colors.reset} ${colors.dim}zmx session manager${colors.reset}`);

  const sessions = getZmxSessions();

  if (sessions.length === 0) {
    console.log(`${colors.dim}No active zmx sessions${colors.reset}\n`);

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

    console.log(
      `  ${colors.cyan}${letter}${colors.reset}) ${session.name}`
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
    // Kill all sessions
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
