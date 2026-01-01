---
name: lumio-deploy
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- deploy
- redeploy
- publish
- lumio cli
---

# Lumio Contract Deployment

## Auto-Setup

The counter template auto-deploys on conversation start:
- Project: `/workspace/app`
- Contract: Already deployed
- Frontend: Already running at `$APP_BASE_URL_1`

Check current state:
```bash
ls /workspace/app
cat /workspace/app/frontend/.env
```

## Deployment Workflow

### 1. Compile Contract

```bash
cd /workspace/app/contract
lumio move compile --package-dir .
```

### 2. Run Tests (MANDATORY!)

```bash
cd /workspace/app/contract
lumio move test --package-dir .
```

**DO NOT deploy until ALL tests pass!**

### 3. Deploy Contract

**Standard deploy (same account):**
```bash
bash /openhands/templates/counter/redeploy.sh /workspace/app
```

**New account (for ABI incompatible changes):**
```bash
bash /openhands/templates/counter/redeploy.sh /workspace/app --new-account
```

The script automatically:
1. Compiles contract
2. Deploys to Lumio testnet
3. Updates `.env` with new contract address
4. Restarts frontend

## Manual Commands (rarely needed)

```bash
# Fund account
lumio account fund-with-faucet --amount 100000000

# Check account
lumio account list

# Manual deploy (prefer redeploy.sh!)
cd /workspace/app/contract
lumio move deploy --package-dir . --assume-yes
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `BACKWARD_INCOMPATIBLE_MODULE_UPDATE` | Use `--new-account` flag |
| `Account does not exist` | Run `lumio account fund-with-faucet` |
| `Insufficient balance` | Run `lumio account fund-with-faucet` |
| `Compilation failed` | Fix Move code errors |
| Frontend shows old address | Check `.env` was updated, restart frontend |

## After Deployment

1. Verify `.env` has new contract address:
   ```bash
   cat /workspace/app/frontend/.env
   ```

2. Update `useContract.ts` if module name changed:
   ```typescript
   const MODULE_NAME = 'your_new_module';
   ```

3. Browser test all functionality at `http://localhost:$APP_PORT_1`
