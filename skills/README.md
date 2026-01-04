# LumioVibe Skills

Skills are specialized prompts that enhance LumioVibe agents with domain-specific knowledge for building Move smart contracts and React frontends on Lumio Network.

## Available Skills

### Lumio-Specific Skills

| Skill | Triggers | Description |
|-------|----------|-------------|
| `lumio-move.md` | move, smart contract, lumio contract | Move language development for Lumio |
| `lumio-react.md` | react, frontend, vite, pontem, wallet | React frontend with Pontem Wallet |
| `lumio-deploy.md` | deploy, redeploy, publish, lumio cli | Contract deployment workflow |

### General Development Skills

| Skill | Triggers | Description |
|-------|----------|-------------|
| `github.md` | github, git | GitHub operations (PRs, push) |
| `code-review.md` | /codereview | Code review feedback |
| `security.md` | security, vulnerability | Security best practices |
| `npm.md` | npm | npm/pnpm usage tips |
| `default-tools.md` | - | MCP tools (always loaded) |

## Repository Microagents

LumioVibe-specific microagents in `.openhands/microagents/`:

| File | Purpose |
|------|---------|
| `lumiovibe.md` | Main workflow (7 phases) |
| `lumio-cli.md` | Lumio CLI commands |
| `move-syntax.md` | Move language reference |
| `frontend-template.md` | React patterns & Pontem API |
| `pontem-wallet.md` | Wallet integration |
| `common-errors.md` | Error troubleshooting |

## How Skills Work

Skills are triggered by keywords in conversations:

1. **Keyword triggers** - When user mentions "move", "deploy", "react", etc.
2. **Slash commands** - `/codereview` triggers code review skill
3. **Always loaded** - `default-tools.md` loads automatically

## Skill Format

```yaml
---
name: skill-name
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- keyword1
- keyword2
---

# Skill content in markdown
```

## LumioVibe Tech Stack

Skills are optimized for:
- **Move** - Smart contracts for Lumio Network
- **React 19 + Vite 7** - Frontend framework
- **TailwindCSS 4** - Styling
- **Pontem Wallet** - Direct API integration
- **Lumio CLI v7.8.0** - Contract compilation & deployment
