---
name: lumio-cli
type: repo
version: 3.0.0
agent: CodeActAgent
---

# Lumio CLI Reference

Lumio CLI is a fork of Aptos CLI for Lumio Network.

## CRITICAL: Auto-Setup

<IMPORTANT>
⚠️⚠️⚠️ READ THIS CAREFULLY ⚠️⚠️⚠️

The counter template **auto-deploys** when conversation starts!
- Project location: `/workspace/app`
- Config location: `/workspace/.lumio/config.yaml`
- Contract already deployed
- Frontend already running

❌ DO NOT run `lumio init` manually - template handles it!
❌ DO NOT manually create new projects!

✅ Check existing project:
```bash
ls /workspace/app
cat /workspace/app/frontend/.env
```

✅ Redeploy after changes:
```bash
bash /openhands/templates/counter/redeploy.sh /workspace/app
```
</IMPORTANT>

## Workflow

```bash
# Project is already at /workspace/app

# Modify contract
cd /workspace/app/contract
# Edit sources/counter.move

# Compile
lumio move compile --package-dir .

# Test
lumio move test --package-dir .

# Redeploy (updates frontend automatically!)
bash /openhands/templates/counter/redeploy.sh /workspace/app
```

## Common Commands

### Compilation

```bash
# Compile Move package
cd /workspace/app/contract
lumio move compile --package-dir .

# Run tests
lumio move test --package-dir .
```

### Account Management

```bash
# Fund from faucet (testnet only)
lumio account fund-with-faucet --amount 100000000

# Check balance
lumio account list

# Get account address
lumio account list | grep "Account Address"
```

### Deployment

```bash
# Manual deploy (prefer redeploy.sh instead!)
cd /workspace/app/contract
lumio move deploy --package-dir . --assume-yes

# Contract address = deployer's address (from lumio account list)
```

## Redeploy Scripts

```bash
# Redeploy with current account (compatible changes)
bash /openhands/templates/counter/redeploy.sh /workspace/app

# Redeploy with NEW account (ABI incompatible changes)
bash /openhands/templates/counter/redeploy.sh /workspace/app --new-account
```

The script automatically:
1. Compiles contract
2. Deploys to Lumio testnet
3. Updates `.env` with new contract address
4. Restarts frontend

## Troubleshooting

### Quick Reference Table

| Error | Solution |
|-------|----------|
| `Unable to find config` | Check `/workspace/.lumio/config.yaml` exists |
| `Account does not exist` | Run `lumio account fund-with-faucet --amount 100000000` |
| `Insufficient balance` | Run `lumio account fund-with-faucet --amount 100000000` |
| `Module already published` | Use redeploy script |
| `Compilation failed` | Fix Move code errors shown in output |
| `BACKWARD_INCOMPATIBLE` | Use `redeploy.sh --new-account` |

### ABI Incompatible / Need New Account

```bash
# Use the redeploy script with --new-account flag
bash /openhands/templates/counter/redeploy.sh /workspace/app --new-account
```

This automatically:
- Creates new Lumio account
- Funds from faucet
- Updates Move.toml
- Updates frontend .env
- Deploys contract
- Restarts frontend

### Faucet Not Working

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

### Wrong Command Syntax

```bash
# ❌ WRONG commands (do NOT use):
lumio init counter           # No argument for init!
lumio account create         # Not a real command
lumio account generate       # Not a real command

# ✅ CORRECT commands:
lumio account fund-with-faucet --amount 100000000
lumio account list
lumio move compile --package-dir .
lumio move test --package-dir .
lumio move deploy --package-dir . --assume-yes
```

## Important Notes

1. **Project location:** `/workspace/app` (auto-created)
2. **Config location:** `/workspace/.lumio/config.yaml`
3. **Contract address:** Same as deployer's account address
4. **Frontend .env:** Contains `VITE_CONTRACT_ADDRESS`

## Example Session

```bash
# Check deployed address
cat /workspace/app/frontend/.env
# VITE_CONTRACT_ADDRESS=0x...

# Modify contract
cd /workspace/app/contract
# Edit sources/counter.move

# Compile
lumio move compile --package-dir .
# ✅ Success

# Test
lumio move test --package-dir .
# ✅ All tests pass

# Redeploy
bash /openhands/templates/counter/redeploy.sh /workspace/app
# ✅ Contract redeployed
# ✅ Frontend updated with new address
# ✅ Frontend restarted
```
