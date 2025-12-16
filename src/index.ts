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

interface CliOptions {
  command: 'interactive' | 'list' | 'attach' | 'create' | 'kill' | 'help' | 'version';
  sessionName?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return { command: 'interactive' };
  }

  const first = args[0];

  // Handle flags
  if (first === '-l' || first === '--list') {
    return { command: 'list' };
  }
  if (first === '-h' || first === '--help') {
    return { command: 'help' };
  }
  if (first === '-v' || first === '--version') {
    return { command: 'version' };
  }
  if (first === '-a' || first === '--attach') {
    if (!args[1]) {
      console.error(`${colors.red}Error:${colors.reset} --attach requires a session name`);
      process.exit(1);
    }
    return { command: 'attach', sessionName: args[1] };
  }
  if (first === '-c' || first === '--create') {
    if (!args[1]) {
      console.error(`${colors.red}Error:${colors.reset} --create requires a session name`);
      process.exit(1);
    }
    return { command: 'create', sessionName: args[1] };
  }
  if (first === '-k' || first === '--kill') {
    if (!args[1]) {
      console.error(`${colors.red}Error:${colors.reset} --kill requires a session name`);
      process.exit(1);
    }
    return { command: 'kill', sessionName: args[1] };
  }

  // Positional argument = session name (attach/create)
  if (!first.startsWith('-')) {
    return { command: 'attach', sessionName: first };
  }

  // Unknown flag
  console.error(`${colors.red}Error:${colors.reset} Unknown option: ${first}`);
  console.error('Run "poof --help" for usage information');
  process.exit(1);
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

// Non-interactive CLI commands

function showHelp(): void {
  console.log(`
${colors.cyan}poof${colors.reset} - zmx session manager

${colors.yellow}USAGE:${colors.reset}
  poof                      Interactive mode (default)
  poof <session>            Attach to session (creates if not exists)
  poof -l, --list           List all sessions
  poof -a, --attach <name>  Attach to session (creates if not exists)
  poof -c, --create <name>  Create a new session (fails if exists)
  poof -k, --kill <name>    Kill a session
  poof -h, --help           Show this help
  poof -v, --version        Show version

${colors.yellow}EXAMPLES:${colors.reset}
  poof                      Start interactive session picker
  poof myproject            Attach to or create "myproject"
  poof -l                   List all active sessions
  poof -k myproject         Kill the "myproject" session
`);
}

function showVersion(): void {
  console.log('poof v1.0.0');
}

function listSessionsDirect(): void {
  const sessions = getZmxSessions();

  if (sessions.length === 0) {
    console.log('No active zmx sessions');
    return;
  }

  console.log('Active zmx sessions:');
  sessions.forEach((session, index) => {
    const letter = generateLetterDesignation(index);
    console.log(`  ${letter}) ${session.name}`);
  });
}

function attachSessionDirect(sessionName: string): void {
  const zmx = spawn('zmx', ['attach', sessionName], {
    stdio: 'inherit',
  });

  zmx.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function createSessionDirect(sessionName: string): void {
  const sessions = getZmxSessions();
  const exists = sessions.some(s => s.name === sessionName);

  if (exists) {
    console.error(`${colors.red}Error:${colors.reset} Session "${sessionName}" already exists. Use --attach instead.`);
    process.exit(1);
  }

  const zmx = spawn('zmx', ['attach', sessionName], {
    stdio: 'inherit',
  });

  zmx.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function killSessionDirect(sessionName: string): void {
  const sessions = getZmxSessions();
  const exists = sessions.some(s => s.name === sessionName);

  if (!exists) {
    console.error(`${colors.red}Error:${colors.reset} Session "${sessionName}" not found`);
    process.exit(1);
  }

  try {
    execSync(`zmx kill "${sessionName}"`, { stdio: 'pipe' });
    console.log(`${colors.green}✓${colors.reset} Killed session: ${sessionName}`);
  } catch (error: any) {
    console.error(`${colors.red}✖${colors.reset} Failed to kill session: ${sessionName}`);
    process.exit(1);
  }
}

async function runInteractiveMode() {
  console.clear();

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

async function main() {
  const options = parseArgs();

  // Help and version don't need zmx
  if (options.command === 'help') {
    showHelp();
    return;
  }
  if (options.command === 'version') {
    showVersion();
    return;
  }

  // All other commands need zmx
  await ensureZmx();

  switch (options.command) {
    case 'list':
      listSessionsDirect();
      break;
    case 'attach':
      attachSessionDirect(options.sessionName!);
      break;
    case 'create':
      createSessionDirect(options.sessionName!);
      break;
    case 'kill':
      killSessionDirect(options.sessionName!);
      break;
    case 'interactive':
    default:
      await runInteractiveMode();
      break;
  }
}

main().catch((error) => {
  console.error(`${colors.red}Error:${colors.reset}`, error.message);
  process.exit(1);
});
