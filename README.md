<div align="center">
  <h1>🌟 LumioVibe</h1>
  <p><strong>AI-Powered Development for Lumio Network</strong></p>
  <p>Vibe coding tool for building Move smart contracts and React frontends</p>
</div>

<div align="center">
  <a href="https://lumio.io"><img src="https://img.shields.io/badge/Lumio-Network-6B46C1?style=for-the-badge" alt="Lumio Network"></a>
  <a href="https://github.com/OpenHands/OpenHands"><img src="https://img.shields.io/badge/Fork_of-OpenHands-20B2AA?style=for-the-badge" alt="Fork of OpenHands"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-green?style=for-the-badge" alt="MIT License"></a>
</div>

<hr>

## 🚀 What is LumioVibe?

LumioVibe is a specialized AI development tool for the [Lumio Network](https://lumio.io) ecosystem. Built on top of [OpenHands](https://github.com/OpenHands/OpenHands), it focuses exclusively on:

- ✨ **Move Smart Contracts** - Create and deploy Move contracts to Lumio testnet
- 🔧 **TypeScript Clients** - Auto-generate type-safe clients with tests
- 🎨 **React Frontends** - Build beautiful UIs with Pontem Wallet integration
- 📚 **Auto Documentation** - Every contract gets a documentation page

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/pontem-network/lumiovibe.git
cd lumiovibe

# Build the project
make build

# Run LumioVibe
make run
```

Then open http://localhost:3001 and start building!

## 🎯 What Makes LumioVibe Special?

### 🔄 Iterative Development
The AI doesn't stop at errors - it analyzes, fixes, and retries until success.

### 📦 Complete Projects
Every contract gets:
- ✅ Compiled and deployed Move contract
- ✅ TypeScript client with comprehensive tests
- ✅ React frontend with wallet integration
- ✅ Documentation page with usage examples

### 🎨 Predictable Stack
Fixed technology choices mean reliable results:
- **Blockchain:** Lumio Network (Aptos fork)
- **Language:** Move for contracts, TypeScript for clients
- **Frontend:** React 19 + Vite 6 + TailwindCSS 4
- **Wallet:** Pontem Wallet

### 🌐 Testnet First
All deployments go to Lumio testnet - safe for experimentation, no real funds at risk.

## 📖 Example Usage

```
You: "Create a counter contract with increment and get_count functions"

LumioVibe:
1. ✅ Creates Move contract with Counter resource
2. ✅ Compiles and deploys to Lumio testnet
3. ✅ Generates TypeScript client with tests
4. ✅ Builds React UI with increment button
5. ✅ Launches frontend at http://localhost:5173
```

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| CLI | Lumio CLI v7.8.0 |
| Testnet | https://api.testnet.lumio.io/v1 |
| SDK | @aptos-labs/ts-sdk |
| Frontend | React 19 + Vite 6 |
| Styling | TailwindCSS 4 |
| Wallet | Pontem Wallet |

## 📂 Project Structure

Every generated project follows this structure:

```
project-name/
├── contract/           # Move smart contract
│   ├── Move.toml
│   └── sources/
├── client/            # TypeScript client
│   ├── src/
│   └── tests/
└── frontend/          # React application
    ├── src/
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   └── Documentation.tsx
    │   └── hooks/
    └── package.json
```

## 🎓 Learn More

- [Design Document](LUMIO_VIBE_DESIGN.md) - Detailed architecture and workflow
- [Setup Guide](LUMIOVIBE_SETUP.md) - Installation and configuration
- [Lumio Network](https://lumio.io) - Official Lumio documentation
- [OpenHands](https://github.com/OpenHands/OpenHands) - The foundation we built on

## 🤝 Contributing

LumioVibe is specialized for Lumio Network development. For contributions:

1. Read [LUMIO_VIBE_DESIGN.md](LUMIO_VIBE_DESIGN.md) for architecture details
2. Check existing microagents in `.openhands/microagents/`
3. Submit PRs with improvements to Move templates or frontend generation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

LumioVibe is a fork of [OpenHands](https://github.com/OpenHands/OpenHands), which is also MIT-licensed.

## 🙏 Acknowledgments

Built with ❤️ on top of [OpenHands](https://github.com/OpenHands/OpenHands) - the amazing open-source AI development platform.

Special thanks to the Lumio Network team for creating an awesome Move-based blockchain!

---

<div align="center">
  <p>Made for the Lumio Network community 🌟</p>
  <p><a href="https://lumio.io">Visit Lumio Network</a></p>
</div>
