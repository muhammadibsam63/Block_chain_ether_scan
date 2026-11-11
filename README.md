# EtherReceipt

Check that an ETH/USDC payment landed, look up any wallet, and send payments from your own wallet.
Networks: Ethereum Mainnet, Sepolia, Hoodi. React 18 + Vite, no other dependencies.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy to Vercel
Push to GitHub and import the repo in Vercel. Framework preset: Vite. No environment variables needed.

## Features
- Wallet lookup: live balance, USD value (Mainnet), gas price, last 20 transactions, recent lookups
- Payment check: verifies status, receiver and exact amount (ETH or USDC Transfer event), confirmations, copy/print receipt
- Send: ETH or USDC via MetaMask, review screen with fee estimate, then "Verify this payment"
- Contacts and activity log (saved in this browser's localStorage), JSON backup export
- Dark/light theme, mobile friendly

## Where to edit
- `src/lib/chain.js`: networks, RPC URLs, USDC addresses, helpers
- `src/styles.css`: colours are CSS variables at the top (`--ac`, `--ac2` are the accent colours)
- `src/components/`: Wallet, Verify, Send, Book (contacts and log)

## Notes
- Transaction history and ETH price use Blockscout and CoinGecko. If they are down, the rest still works.
- Hoodi has no USDC configured. Add an address in `chain.js` if you have one.
- Never ask users for a seed phrase or private key.
