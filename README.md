# poof

An interactive CLI for managing zmx sessions with an intuitive interface built with Bun.js and Clack.

## Features

- **Interactive session picker** with a-z letter shortcuts
- **Quick session switching** - just type a letter
- **Fast session creation** - type a name or press Enter for UUID
- **Single executable** - no runtime dependencies needed
- **Beautiful CLI** - powered by Clack prompts

## Prerequisites

This tool requires `zmx` to be installed on your system.

**macOS (Apple Silicon):**
```bash
curl -LO https://zmx.sh/a/zmx-0.0.2-macos-aarch64.tar.gz
tar -xzf zmx-0.0.2-macos-aarch64.tar.gz
mv zmx ~/.local/bin/  # or /usr/local/bin/
```

**macOS (Intel):**
```bash
curl -LO https://zmx.sh/a/zmx-0.0.2-macos-x86_64.tar.gz
tar -xzf zmx-0.0.2-macos-x86_64.tar.gz
mv zmx ~/.local/bin/  # or /usr/local/bin/
```

**Linux (x86_64):**
```bash
curl -LO https://zmx.sh/a/zmx-0.0.2-linux-x86_64.tar.gz
tar -xzf zmx-0.0.2-linux-x86_64.tar.gz
mv zmx ~/.local/bin/  # or /usr/local/bin/
```

For more information, see: https://github.com/neurosnap/zmx

## Installation

### Option 1: Use the pre-built executable

```bash
# Make it executable
chmod +x ./poof

# Optionally, move to your PATH
sudo mv ./poof /usr/local/bin/
```

### Option 2: Build from source

```bash
# Install dependencies
bun install

# Build the standalone executable
bun run build

# The executable will be created as './poof'
```

## Usage

Simply run the command to see your zmx sessions:

```bash
./poof
```

### Interactions

**When sessions exist:**
- Type a single letter (a-z) and press Enter to attach to that session
- Type 2+ characters and press Enter to create a new session with that name
- Press Enter without typing to create a new session with a UUID name
- Type "reset" to kill all sessions

**When no sessions exist:**
- Type a name and press Enter to create a new session with that name
- Press Enter without typing to create a new session with a UUID name

### Detaching from a session

Press `Ctrl+\` to detach from the current session without terminating it.

### Examples

```bash
# Run the CLI
./poof

# Example output:
# Active sessions:
#
#   a) project1
#   b) work
#   c) dev
#
# Select session (letter), create new (name), type "reset" to kill all, or press Enter for UUID:

# Type 'a' + Enter → Attach to 'project1'
# Type 'mynewproject' + Enter → Create new session 'mynewproject'
# Press Enter → Create new session with UUID name
```

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build standalone executable
bun run build
```

## How It Works

The CLI uses:
- **@clack/prompts** for the beautiful interactive interface
- **Bun's built-in APIs** for executing zmx commands
- **child_process spawn** to hand over terminal control to zmx

When you select or create a session, the CLI spawns a zmx process with `stdio: 'inherit'`, which hands over complete terminal control to zmx. When you detach from zmx (Ctrl+\), you return to your normal shell.

## Technical Details

- Built with **Bun.js** and **TypeScript**
- Single-file implementation for simplicity
- Standalone executable (~58MB) includes Bun runtime
- No external runtime dependencies after building

## License

MIT
