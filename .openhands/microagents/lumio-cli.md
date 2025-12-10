---
name: lumio-cli
type: knowledge
version: 2.0.0
agent: CodeActAgent
triggers:
- lumio
- compile
- deploy
- publish
- faucet
---

# Lumio CLI Reference

Lumio CLI is a fork of Aptos CLI for Lumio Network.

## CRITICAL: Account Setup

<IMPORTANT>
⚠️⚠️⚠️ READ THIS CAREFULLY ⚠️⚠️⚠️

Lumio CLI is ALREADY configured and ready to use!
- Config location: /home/openhands/.lumio/config.yaml (primary)
- Symlink available: /workspace/.lumio → /home/openhands/.lumio
- Works from any directory!

❌ DO NOT run `lumio init` - it will break the setup!
❌ DO NOT manually edit or create config files!
❌ DO NOT try to troubleshoot config issues manually!

✅ The config is pre-configured with:
- Network: Testnet
- API: https://api.testnet.lumio.io/v1
- Faucet: https://faucet.testnet.lumio.io

✅ ALWAYS use this to start a new project:
   bash /openhands/templates/scaffold-fast.sh PROJECT_NAME
   (This handles account creation and funding automatically)
</IMPORTANT>

## Deployment Workflow (CORRECT)

⚠️ **ALWAYS START WITH scaffold-fast.sh** - it sets up everything!

```bash
# STEP 0: Create project (THIS IS MANDATORY!)
bash /openhands/templates/scaffold-fast.sh PROJECT_NAME
cd /workspace/PROJECT_NAME

# The above command already:
# - Created account
# - Funded it from faucet
# - Set up Move.toml with correct address
# - Compiled a working example

# STEP 1: Modify and compile your contract
cd contract
lumio move compile --package-dir .

# STEP 2: Deploy contract
lumio move publish --package-dir . --assume-yes
```

## Common Commands

### Compilation

```bash
# Compile Move package
lumio move compile --package-dir contract/

# Run tests
lumio move test --package-dir contract/
```

### Account Management

```bash
# Fund from faucet (testnet only) - creates account if needed
lumio account fund-with-faucet --amount 100000000

# Check balance
lumio account list

# Get account address
lumio account list | grep "Account Address"
```

### Deployment

```bash
# Publish to testnet
lumio move publish --package-dir contract/ --assume-yes

# The output will contain:
# {
#   "Result": {
#     "transaction_hash": "0x...",
#     "gas_used": ...,
#     "vm_status": "Executed successfully"
#   }
# }

# Contract address = deployer's address (from lumio account list)
```

## Getting Contract Address

After deployment:

```bash
# Get your account address (this is also the contract address)
lumio account list

# Output will show:
# Account Address: 0xYOUR_ADDRESS
# This is your contract address!
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Unable to read config` | Config exists as symlink at `/workspace/.lumio`. DO NOT run `lumio init` |
| `Account does not exist` | Run `lumio account fund-with-faucet --amount 100000000` - it will create account |
| `Insufficient balance` | Run `lumio account fund-with-faucet --amount 100000000` again |
| `Module already published` | Contract already deployed, use different account or module name |
| `Compilation failed` | Fix Move code errors shown in output |

## Important Notes

1. **Config location:** `/home/openhands/.lumio/config.yaml` (primary location)
2. **Symlink:** `/workspace/.lumio` → `/home/openhands/.lumio` (works from anywhere!)
3. **Don't run:** `lumio init` (config is pre-configured)
4. **Account creation:** Automatic on first `fund-with-faucet`
5. **Contract address:** Same as deployer's account address

## Example Session

```bash
# Navigate to contract
cd /workspace/my_project/contract

# Compile
lumio move compile --package-dir .
# ✅ Success - bytecode generated

# Fund account (creates if doesn't exist)
lumio account fund-with-faucet --amount 100000000
# ✅ Account funded

# Get address
lumio account list
# Account Address: 0x5509970d628fdff67236db5e2...

# Deploy
lumio move publish --package-dir . --assume-yes
# ✅ Module published

# Contract is now at: 0x5509970d628fdff67236db5e2...
```

## Config File Location

**Primary location:** `/home/openhands/.lumio/config.yaml`

**Symlink (for convenience):** `/workspace/.lumio` → `/home/openhands/.lumio`

The config is pre-configured and accessible from any directory!
