# poof

An interactive CLI for managing shpool sessions with an intuitive interface built with Bun.js and Clack.

## Features

- **Interactive session picker** with a-z letter shortcuts
- **Quick session switching** - just type a letter
- **Fast session creation** - type a name or press Enter for UUID
- **Single executable** - no runtime dependencies needed
- **Beautiful CLI** - powered by Clack prompts

## Prerequisites

This tool requires `shpool` to be installed on your system:

**macOS:**
```bash
brew install shpool
# or
cargo install shpool
```

**Linux:**
```bash
cargo install shpool
```

For more information, see: https://github.com/shell-pool/shpool

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

Simply run the command to see your shpool sessions:

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

### Examples

```bash
# Run the CLI
./poof

# Example output:
# Active sessions:
#
#   a) project1 ●
#   b) work ○
#   c) dev ○
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
- **Bun's built-in APIs** for executing shpool commands
- **child_process spawn** to hand over terminal control to shpool

When you select or create a session, the CLI spawns a shpool process with `stdio: 'inherit'`, which hands over complete terminal control to shpool. When you detach from shpool, you return to your normal shell.

## Technical Details

- Built with **Bun.js** and **TypeScript**
- Single-file implementation for simplicity
- Standalone executable (~58MB) includes Bun runtime
- No external runtime dependencies after building

## License

MIT
