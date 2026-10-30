# VoteLedger

**An interactive simulator for cryptographic election integrity.**

VoteLedger demonstrates how modern democracies can combine **SHA-256 digital fingerprints** with the **Bitcoin blockchain** to make vote tallies transparent and tamper-evident. Adjust vote counts across polling units, lock a fingerprint, anchor it on-chain, then try to secretly alter the results and watch the audit fail instantly.

> This is an educational prototype. It is **not** a production voting system.

![VoteLedger](src/assets/hero.png)

## Features

- **Multi-unit vote simulation** — manage tallies across several polling units.
- **SHA-256 fingerprints** — every tally is hashed into a deterministic, reproducible digest.
- **Bitcoin anchoring** — simulate embedding the fingerprint in an `OP_RETURN` output and broadcasting it to the network.
- **Tamper detection** — alter a locked tally and the audit immediately flags a hash mismatch.
- **Voter verification demo** — capture a webcam frame, hash it, and enforce one-vote-per-identity using local storage.
- **QR receipts** — generate a scannable receipt for each fingerprint.
- **Bitcoin regtest dev panel** — connect to a local `bitcoind` regtest node, inspect block height and mempool, and mine blocks.

## Tech stack

- [React 19](https://react.dev/)
- [Vite](https://vite.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Express](https://expressjs.com/) (local Bitcoin RPC proxy)
- [lucide-react](https://lucide.dev/) icons

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm (bundled with Node.js)
- Optional: [Bitcoin Core](https://bitcoincore.org/) for the regtest dev panel

### Install

```bash
git clone https://github.com/almuslavish/VOTELEDGER-X.git
cd VOTELEDGER-X
npm install
```

### Run the app

```bash
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

### Run the Bitcoin RPC proxy

The optional proxy forwards requests to a local Bitcoin Core node.

```bash
npm run server
```

To run both the app and proxy together:

```bash
npm run dev:all
```

### Bitcoin regtest (optional)

The proxy expects a regtest node at `http://127.0.0.1:18443` with RPC credentials `dev:devpassword`. A minimal setup:

```bash
bitcoind -regtest -rpcuser=dev -rpcpassword=devpassword -rpcport=18443 -daemon
```

Create a wallet and mine some blocks if needed:

```bash
bitcoin-cli -regtest -rpcuser=dev -rpcpassword=devpassword -rpcport=18443 createwallet demo
bitcoin-cli -regtest -rpcuser=dev -rpcpassword=devpassword -rpcport=18443 generatetoaddress 101 "$(bitcoin-cli -regtest -rpcuser=dev -rpcpassword=devpassword -rpcport=18443 getnewaddress)"
```

> The credentials above are for local development only. Never reuse them on a real network.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run server` | Start the Bitcoin RPC proxy on port 5000 |
| `npm run dev:all` | Start the proxy and Vite together |

## How it works

1. Vote counts for a polling unit are serialized into a canonical JSON string.
2. The string is hashed with SHA-256 to produce a fingerprint.
3. The fingerprint is locked and anchored to a simulated Bitcoin transaction.
4. Any later change to the tally produces a different hash, so the audit detects tampering.

The core logic lives in [`src/App.jsx`](src/App.jsx), with the regtest client in [`src/services/bitcoinRegtest.js`](src/services/bitcoinRegtest.js) and the RPC proxy in [`server/index.js`](server/index.js).

## Project structure

```text
.
├── public/                  # Static assets
├── server/
│   └── index.js             # Express Bitcoin RPC proxy
├── src/
│   ├── assets/              # Images and icons
│   ├── components/          # UI components (regtest dev panel)
│   ├── services/            # Bitcoin regtest client
│   ├── App.jsx              # Main simulator
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-change`.
3. Make your changes and run `npm run lint`.
4. Commit and push your branch.
5. Open a pull request.

For bugs or feature ideas, please open an issue.

## License

Released under the [MIT License](LICENSE).

## Disclaimer

VoteLedger is a demonstration project built for learning and civic-tech experimentation. It is not audited, not a voting system, and must not be used to conduct or certify real elections.
