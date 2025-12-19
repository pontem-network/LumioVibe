---
name: lumio-cli
type: repo
version: 2.0.0
agent: CodeActAgent
---

# Lumio CLI Reference

Lumio CLI is a fork of Aptos CLI for Lumio Network.

## CRITICAL: Account Setup

<IMPORTANT>
⚠️⚠️⚠️ READ THIS CAREFULLY ⚠️⚠️⚠️

Lumio CLI is pre-installed and will be auto-configured on first use!
- Config location: /workspace/.lumio/config.yaml (created automatically)
- Works from /workspace directory!

❌ DO NOT run `lumio init` manually - scaffold-fast.sh handles it with `--private-key` flag!
❌ DO NOT manually edit or create config files!

✅ scaffold-fast.sh will automatically:
- Generate random key and run `lumio init --assume-yes --network testnet --private-key <key>`
- Configure testnet (API: https://api.testnet.lumio.io/v1)
- Fund account from faucet

✅ ALWAYS use this to start a new project:
   bash /openhands/templates/scaffold-fast.sh PROJECT_NAME
   (This handles initialization, account creation and funding automatically)
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

### Quick Reference Table

| Error | Solution |
|-------|----------|
| `Unable to find config` | Run `bash /openhands/templates/scaffold-fast.sh PROJECT_NAME` |
| `Account does not exist` | Run `lumio account fund-with-faucet --amount 100000000` |
| `Insufficient balance` | Run `lumio account fund-with-faucet --amount 100000000` |
| `Module already published` | Use redeploy script or rename module |
| `Compilation failed` | Fix Move code errors shown in output |
| `BACKWARD_INCOMPATIBLE` | Create new account (see below) |

### Detailed Solutions

#### Faucet Not Working

```bash
# Try with retries
for i in 1 2 3; do
  lumio account fund-with-faucet --amount 100000000 && break
  echo "Attempt $i failed, waiting 30s..."
  sleep 30
done

# Check result
lumio account list
```

If faucet is down → wait 5-10 min, or create fresh project with scaffold-fast.sh

#### ABI Incompatible / Need New Account

```bash
# Delete old config
rm -rf /workspace/.lumio

# Generate new key and init
PRIVATE_KEY=$(openssl rand -hex 32)
lumio init --assume-yes --network testnet --private-key $PRIVATE_KEY
lumio account fund-with-faucet --amount 100000000

# Get new address
NEW_ADDR=$(lumio account list | grep "Account Address" | awk '{print $NF}')

# Update Move.toml
sed -i "s/deployer_address = .*/deployer_address = \"$NEW_ADDR\"/" contract/Move.toml

# Update frontend
sed -i "s/CONTRACT_ADDRESS = .*/CONTRACT_ADDRESS = '$NEW_ADDR';/" frontend/src/hooks/useContract.ts
```

#### Wrong Command Syntax

```bash
# ❌ WRONG commands (do NOT use):
lumio init counter           # No argument for init!
lumio account create         # Not a real command
lumio account generate       # Not a real command

# ✅ CORRECT commands:
lumio init --assume-yes --network testnet --private-key <KEY>
lumio account fund-with-faucet --amount 100000000
lumio account list
lumio move compile --package-dir .
lumio move test --package-dir .
lumio move publish --package-dir . --assume-yes
```

## Important Notes

1. **Config location:** `/workspace/.lumio/config.yaml` (created by scaffold-fast.sh)
2. **Don't run:** `lumio init` manually (scaffold-fast.sh handles it)
3. **Account creation:** Automatic during scaffold-fast.sh
4. **Contract address:** Same as deployer's account address

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

**Location:** `/workspace/.lumio/config.yaml`

Created automatically by scaffold-fast.sh on first use. Works from /workspace directory.
