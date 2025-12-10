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

interface ShpoolSession {
  name: string;
  status: string;
}

function isShpoolInstalled(): boolean {
  try {
    execSync('which shpool', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function showManualInstallInstructions(): void {
  console.log('\nTo install shpool manually:\n');
  const platform = process.platform;
  if (platform === 'darwin') {
    console.log('  macOS:');
    console.log('    brew install shpool');
    console.log('    # or');
    console.log('    cargo install shpool\n');
  } else if (platform === 'linux') {
    console.log('  Linux:');
    console.log('    cargo install shpool\n');
  } else {
    console.log('  Please install shpool for your operating system');
    console.log('  See: https://github.com/shell-pool/shpool\n');
  }
}

async function ensureShpool(): Promise<void> {
  if (isShpoolInstalled()) {
    return;
  }

  const platform = process.platform;
  const canAutoInstall = platform === 'darwin' || platform === 'linux';

  if (!canAutoInstall) {
    console.error(`${colors.red}✖${colors.reset} shpool is not installed\n`);
    showManualInstallInstructions();
    process.exit(1);
  }

  // Prompt user for auto-install
  const installCommand = platform === 'darwin' ? 'brew install shpool' : 'cargo install shpool';
  const packageManager = platform === 'darwin' ? 'Homebrew' : 'Cargo';

  const shouldInstall = await select({
    message: `shpool is not installed. Install it now using ${packageManager}?`,
    options: [
      { value: true, label: 'Yes, install shpool' },
      { value: false, label: 'No, show manual instructions' },
    ],
  });

  if (isCancel(shouldInstall)) {
    cancel('Operation cancelled');
    process.exit(0);
  }

  if (!shouldInstall) {
    showManualInstallInstructions();
    process.exit(0);
  }

  // Auto-install
  const s = spinner();
  s.start(`Installing shpool via ${packageManager}...`);

  try {
    execSync(installCommand, { stdio: 'pipe' });
    s.stop(`${colors.green}✓${colors.reset} shpool installed successfully`);

    // Verify installation
    if (!isShpoolInstalled()) {
      throw new Error('Installation completed but shpool not found in PATH');
    }
  } catch (error: any) {
    s.stop(`${colors.red}✖${colors.reset} Failed to install shpool`);
    console.error(`\nError: ${error.message}\n`);
    showManualInstallInstructions();
    process.exit(1);
  }
}

function getShpoolSessions(): ShpoolSession[] {
  try {
    const output = execSync('shpool list', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const lines = output.trim().split('\n');

    // Skip header row and parse remaining lines
    return lines
      .slice(1)
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[0],
          status: parts[1] || 'unknown',
        };
      });
  } catch (error: any) {
    // No sessions exist or shpool daemon not running
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

    // Hand over control to shpool
    const shpool = spawn('shpool', ['attach', sessionName], {
      stdio: 'inherit',
    });

    shpool.on('exit', (code) => {
      process.exit(code || 0);
    });
  }, 200);
}

function createSession(sessionName: string): void {
  const s = spinner();
  s.start(`Creating session: ${sessionName}`);

  setTimeout(() => {
    s.stop(`Creating session: ${sessionName}`);

    // In shpool, attach creates a new session if it doesn't exist
    const shpool = spawn('shpool', ['attach', sessionName], {
      stdio: 'inherit',
    });

    shpool.on('exit', (code) => {
      process.exit(code || 0);
    });
  }, 200);
}

function killAllSessions(sessions: ShpoolSession[]): void {
  const s = spinner();
  s.start('Killing all sessions...');

  try {
    sessions.forEach(session => {
      execSync(`shpool kill "${session.name}"`, { stdio: 'pipe' });
    });
    s.stop(`${colors.green}✓${colors.reset} Killed ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`);
  } catch (error: any) {
    s.stop(`${colors.red}✖${colors.reset} Error killing sessions`);
    throw error;
  }
}

async function main() {
  console.clear();

  await ensureShpool();

  intro(`${colors.cyan}poof${colors.reset} ${colors.dim}shpool session manager${colors.reset}`);

  const sessions = getShpoolSessions();

  if (sessions.length === 0) {
    console.log(`${colors.dim}No active shpool sessions${colors.reset}\n`);

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

    const statusIndicator = session.status.toLowerCase() === 'connected'
      ? `${colors.green}●${colors.reset}`
      : `${colors.dim}○${colors.reset}`;

    console.log(
      `  ${colors.cyan}${letter}${colors.reset}) ${session.name} ${statusIndicator}`
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
