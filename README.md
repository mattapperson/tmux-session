# tmux-session

An interactive CLI for managing tmux sessions with an intuitive interface built with Bun.js and Clack.

## Features

- 🎯 **Interactive session picker** with a-z letter shortcuts
- ⚡ **Quick session switching** - just type a letter
- 🆕 **Fast session creation** - type a name or press Enter for UUID
- 📦 **Single executable** - no runtime dependencies needed
- 🎨 **Beautiful CLI** - powered by Clack prompts

## Prerequisites

This tool requires `tmux` to be installed on your system:

**macOS:**
```bash
brew install tmux
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tmux
```

**Fedora/RHEL:**
```bash
sudo dnf install tmux
```

**Arch Linux:**
```bash
sudo pacman -S tmux
```

## Installation

### Option 1: Use the pre-built executable

```bash
# Make it executable
chmod +x ./tmux-session

# Optionally, move to your PATH
sudo mv ./tmux-session /usr/local/bin/
```

### Option 2: Build from source

```bash
# Install dependencies
bun install

# Build the standalone executable
bun run build

# The executable will be created as './tmux-session'
```

## Usage

Simply run the command to see your tmux sessions:

```bash
./tmux-session
```

### Interactions

**When sessions exist:**
- Type a single letter (a-z) and press Enter to attach to that session
- Type 2+ characters and press Enter to create a new session with that name
- Press Enter without typing to create a new session with a UUID name

**When no sessions exist:**
- Type a name and press Enter to create a new session with that name
- Press Enter without typing to create a new session with a UUID name

### Examples

```bash
# Run the CLI
./tmux-session

# Example output:
# Active sessions:
#
#   a) project1 ● (3 windows)
#   b) work ○ (1 window)
#   c) dev ○ (2 windows)
#
# Select session (letter), create new (name), or press Enter for UUID:

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
- **Bun's built-in APIs** for executing tmux commands
- **child_process spawn** to hand over terminal control to tmux

When you select or create a session, the CLI spawns a tmux process with `stdio: 'inherit'`, which hands over complete terminal control to tmux. When you exit tmux, you return to your normal shell.

## Technical Details

- Built with **Bun.js** and **TypeScript**
- Single-file implementation for simplicity
- Standalone executable (~58MB) includes Bun runtime
- No external runtime dependencies after building

## License

MIT
