# LumioVibe - Quick Setup Guide

## What is LumioVibe?

LumioVibe is a specialized AI agent that creates complete Move smart contract applications on Lumio Network:
- ✅ Move contract compiled and deployed to testnet
- ✅ React frontend with Pontem Wallet integration
- ✅ Everything running and ready to use

## System Architecture

### 1. Runtime Environment

**Docker Image:** `ghcr.io/openhands/runtime:oh_v0.62.0_jz7m8x3p9mfvzfhm_99c3kjtvh8d1c2ro`

Pre-installed tools:
- Lumio CLI v7.8.0 (`/openhands/bin/lumio`)
- Node.js v22.21.1
- pnpm v10.25.0
- TypeScript v5.9.3 (global)
- Vite v7.2.7 (global)
- Vitest v4.0.15 (global)

### 2. System Prompts

**Location:** `openhands/agenthub/codeact_agent/prompts/additional_info.j2`

Added `<LUMIO_VIBE_RUNTIME>` section that informs agents:
- All tools are pre-installed
- Templates location: `/openhands/templates/`
- Lumio testnet configuration
- Important: Use `lumio_coin` and `lumio_account` (NOT aptos equivalents)

### 3. Microagents

**Location:** `.openhands/microagents/`

Main microagent: `lumiovibe.md`
- Triggered by keywords: contract, move, smart contract, dapp, deploy, blockchain, lumio
- Defines mandatory 6-phase workflow
- Includes error recovery rules
- Emphasizes: all tools pre-installed, use templates, don't give up on errors

Supporting microagents:
- `lumio-cli.md` - CLI commands reference
- `move-syntax.md` - Move language guide
- `frontend-template.md` - React app structure
- `pontem-wallet.md` - Pontem Wallet integration

### 4. Project Templates

**Location:** `/openhands/templates/`

Structure:
```
templates/
├── move/                   # Move contract templates
│   ├── Move.toml.template
│   └── sources/
├── frontend/               # React app with Pontem Wallet
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       └── hooks/
│           ├── usePontem.ts
│           └── useContract.ts
├── scaffold.sh            # Project scaffolding script
└── scaffold-fast.sh       # Fast scaffolding with pre-configured account
```

## Agent Workflow (v5.0 - Simplified)

```mermaid
graph TD
    A[User Request] --> B[Phase 0: Discovery]
    B --> B1[Step 0.1: Gather Requirements]
    B1 --> B2[Step 0.2: Generate Assumptions]
    B2 --> B3{Step 0.3: User Confirms?}
    B3 -->|No/Corrections| B2
    B3 -->|Yes| B4[Step 0.4: Create spec.md]
    B4 --> C[Phase 1: Environment Setup]
    C --> D[Phase 2: Implement Contract]

    D --> D1{Compile OK?}
    D1 -->|No, Attempt 1-2| D2[Fix & Retry]
    D2 --> D1
    D1 -->|No, Attempt 3| D3[ASK USER: Try different approach?]
    D3 --> D1
    D1 -->|Yes| E[Phase 2.5: Pre-Deploy Checkpoint]

    E --> E1{User approves deploy?}
    E1 -->|No| D
    E1 -->|Yes| F[Phase 3: Deploy]

    F --> G[Phase 4: Frontend]
    G --> H[Phase 5: Report]
```

**Key Checkpoints:**
1. **Phase 0.3** - User confirms assumptions before any code is written
2. **Phase 2.5** - User approves what will be deployed (irreversible)
3. **Smart Retry** - After 2 failures, ask user instead of looping

## Configuration Changes Summary

### Modified Files

1. **`openhands/runtime/utils/runtime_templates/Dockerfile.j2`**
   - Added `/openhands/bin` to PATH in `.bashrc`
   - Added `/openhands/bin` to PATH in `.profile` for login shells
   - Moved LumioVibe dependencies installation outside Ubuntu-only condition

2. **`openhands/runtime/builder/docker.py`**
   - Removed `--no-cache` flag for faster rebuilds

3. **`openhands/agenthub/codeact_agent/prompts/additional_info.j2`**
   - Added `<LUMIO_VIBE_RUNTIME>` section with pre-installed tools info
   - Lumio network configuration
   - Important reminders about not installing tools

4. **`.openhands/microagents/lumiovibe.md`**
   - Complete workflow guide
   - Pre-installed tools emphasis
   - 6-phase mandatory workflow
   - Error recovery rules

## Testing the Setup

### 1. Verify Runtime Image

```bash
docker run --rm --user openhands \
  ghcr.io/openhands/runtime:oh_v0.62.0_jz7m8x3p9mfvzfhm_99c3kjtvh8d1c2ro \
  /bin/bash -lc "lumio --version && node --version && pnpm --version && tsc --version"
```

Expected output:
```
lumio 7.8.0
v22.21.1
10.25.0
Version 5.9.3
```

### 2. Verify Templates

```bash
docker run --rm --user openhands \
  ghcr.io/openhands/runtime:oh_v0.62.0_jz7m8x3p9mfvzfhm_99c3kjtvh8d1c2ro \
  ls -la /openhands/templates/
```

Should see: `move/`, `frontend/`, `scaffold.sh`, `scaffold-fast.sh`

### 3. Verify Microagents

```bash
ls -la .openhands/microagents/
```

Should see: `lumiovibe.md`, `lumio-cli.md`, `move-syntax.md`, `frontend-template.md`, `pontem-wallet.md`

## Usage Example

User request:
```
Create a simple counter contract with increment and get_value functions
```

Agent workflow (v4.0):

**Phase 0: Discovery & Assumptions**
1. Asks: "What's the project name?" → "counter_app"
2. Generates assumptions document:
   - Data: `Counter { value: u64 }` with key ability
   - Functions: `initialize()`, `increment()`, `get_count()`
   - Access: anyone can increment their own counter
   - ❓ Questions: "Should increment accept an amount parameter?"
3. **⏸️ CHECKPOINT:** Shows assumptions, waits for "confirmed"
4. Creates `spec.md` from confirmed assumptions

**Phase 1-2: Setup & Implement**
5. Runs `scaffold-fast.sh counter_app`
6. Writes Move contract based on spec.md
7. Compiles (smart retry: asks user after 2 failures)

**Phase 2.5: Pre-Deploy Checkpoint**
8. **⏸️ CHECKPOINT:** Shows what will be deployed:
   - Module: `0x123...::counter`
   - Functions: initialize, increment, get_count
   - "This is IRREVERSIBLE. Reply 'deploy' to proceed."
9. Waits for explicit "deploy" confirmation

**Phase 3-4: Deploy & Build**
10. Deploys with `lumio move publish`
11. Creates React frontend with Pontem Wallet integration
12. Builds & starts dev server

**Phase 5: Report**
13. Reports completion with URL and confirmed checkpoints

Result: User opened `http://localhost:5173` with full confidence in what was built!

## Key Success Factors

1. **Explicit assumptions** - Agent shows what it plans to build BEFORE writing code
2. **User checkpoints** - Confirmation required before irreversible actions (deploy)
3. **Smart retry** - After 2 failures, ask user instead of endless loop
4. **All tools pre-installed** - Agent doesn't waste time installing
5. **Clear workflow** - 5 phases with user checkpoints
6. **Templates ready** - No writing configs from scratch
7. **Complete solution** - Frontend must run, user sees UI

## Troubleshooting

### Agent tries to install lumio
- **Cause:** Agent didn't read LUMIO_VIBE_RUNTIME section
- **Fix:** Microagent should be triggered - check keywords

### Frontend doesn't start
- **Cause:** Build errors not resolved
- **Fix:** Agent should retry build, fix TypeScript errors

### Contract uses aptos_coin
- **Cause:** Agent didn't follow lumiovibe.md
- **Fix:** Emphasize lumio_coin in both system prompt and microagent

## Next Steps (Phase 5)

Browser Integration:
- Auto-open frontend in OpenHands browser
- Show live preview to user
- No need to manually open URL

Status: Not Started
