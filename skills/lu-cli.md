---
name: lu-cli
type: knowledge
version: 2.0.0
agent: CodeActAgent
triggers:
- lu
- lu init
- lu start
- lu start --test
- lu status
- lu logs
- lu redeploy
- lumiovibe cli
- project management
- init-status
---

# LumioVibe CLI (`lu`)

Universal CLI tool for Lumio dApp development. Replaces per-template bash scripts.

## Quick Reference

```bash
lu init <template> [name]     # Create project from template
lu init <template> -b         # Create project in background
lu init-status                # Check background init progress
lu start [project_dir]        # Start frontend in background
lu start --test               # Start in test mode (auto-sign TX)
lu status                     # Check status and logs
lu logs [-f]                  # View logs (optionally follow)
lu redeploy [--new-account]   # Redeploy contract
lu list                       # List available templates
```

## Commands

### `lu init` - Create Project

Create a new project from template:

```bash
lu init counter my_app          # Creates /workspace/my_app from counter template
lu init token                   # Creates /workspace/app from token template
lu init nft defi_nft            # Creates /workspace/defi_nft from nft template
lu init counter --background    # Run init in background (non-blocking)
lu init counter -b              # Short form
```

Available templates: `counter`, `token`, `nft`, `staking`, `swap`

The init command:
1. Copies template to destination
2. Creates Lumio account
3. Funds account from faucet
4. Updates Move.toml with account address
5. Compiles and deploys contract
6. Creates frontend `.env` with contract address
7. Installs frontend dependencies
8. Starts frontend in background

### `lu init-status` - Check Init Progress

Check background init progress:

```bash
lu init-status
```

Shows current step and recent output. Use this after `lu init --background`.

### `lu start` - Start Frontend

Start the frontend dev server in background:

```bash
lu start                      # Start current project (/workspace/app)
lu start /workspace/my_app    # Start specific project
```

The start command:
1. Stops any existing frontend process
2. Starts Vite dev server on `$APP_PORT_1`
3. Logs output to `/tmp/lumiovibe-frontend.log`
4. Saves PID to `/tmp/lumiovibe-frontend.pid`

### `lu status` - Check Status

Check frontend status and recent logs:

```bash
lu status
```

Output includes:
- Frontend running status
- PID and project path
- Last 20 log lines
- Contract address from `.env`

### `lu logs` - View Logs

View frontend logs:

```bash
lu logs           # Show last 50 lines
lu logs -f        # Follow logs in real-time (Ctrl+C to stop)
```

### `lu redeploy` - Redeploy Contract

Redeploy the smart contract:

```bash
lu redeploy                   # Same account
lu redeploy --new-account     # New account (for ABI changes)
lu redeploy /workspace/my_app # Specific project
```

The redeploy command:
1. Compiles contract
2. (If `--new-account`) Creates new Lumio account and funds it
3. Deploys to Lumio testnet
4. Updates frontend `.env` with new address
5. Restarts frontend

Use `--new-account` when you get `BACKWARD_INCOMPATIBLE_MODULE_UPDATE` error.

### `lu list` - List Templates

List available templates:

```bash
lu list
```

## Typical Workflow

```bash
# Check current project status
lu status

# Modify contract
cd /workspace/app/contract
# Edit sources/counter.move

# Compile and test
lumio move compile --package-dir .
lumio move test --package-dir .

# Redeploy
lu redeploy

# Check logs if issues
lu logs -f

# For incompatible changes
lu redeploy --new-account
```

## Files Created

| File | Purpose |
|------|---------|
| `/tmp/lumiovibe-frontend.pid` | Frontend process ID |
| `/tmp/lumiovibe-frontend.log` | Frontend output logs |
| `/tmp/lumiovibe-current-project` | Current project path |

## Environment Variables

The `lu` CLI uses these environment variables:

| Variable | Purpose |
|----------|---------|
| `WORKSPACE` | Workspace root (default: `/workspace`) |
| `APP_PORT_1` | Frontend dev server port |
| `APP_BASE_URL_1` | External URL for users |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend not starting | Run `lu logs` to see errors |
| Port already in use | Run `lu start` (auto-kills old process) |
| Contract address mismatch | Check `.env` or run `lu redeploy` |
| ABI incompatible | Run `lu redeploy --new-account` |
| Dependencies missing | Run `cd frontend && pnpm install` |
