// ---- Networks. Edit RPC / token addresses here. ----
export const NETS = {
  1: { id: 1, name: "Mainnet", full: "Ethereum Mainnet", hex: "0x1",
    rpc: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"],
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    scan: "https://etherscan.io", bs: "https://eth.blockscout.com" },
  11155111: { id: 11155111, name: "Sepolia", full: "Sepolia testnet", hex: "0xaa36a7",
    rpc: ["https://ethereum-sepolia-rpc.publicnode.com"],
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    scan: "https://sepolia.etherscan.io", bs: "https://eth-sepolia.blockscout.com" },
  560048: { id: 560048, name: "Hoodi", full: "Hoodi testnet", hex: "0x88bb0",
    rpc: ["https://ethereum-hoodi-rpc.publicnode.com"], usdc: null,
    scan: "https://hoodi.etherscan.io", bs: "https://eth-hoodi.blockscout.com" },
};
export const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daafa952ba7f163c4a11628f55a4df523b3";

export const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
export const isHash = (h) => /^0x[0-9a-fA-F]{64}$/.test(h || "");
export const short = (a = "") => (a.length > 12 ? a.slice(0, 6) + "…" + a.slice(-4) : a);
export const decimals = (asset) => (asset === "ETH" ? 18 : 6);

export function parseU(v, d, asset = "ETH") {
  v = (v || "").trim();
  if (!/^\d*\.?\d*$/.test(v) || v === "" || v === ".") throw new Error("Enter a valid amount.");
  const [i, f = ""] = v.split(".");
  if (f.length > d) throw new Error(`${asset} supports up to ${d} decimal places.`);
  return BigInt((i || "0") + f.padEnd(d, "0"));
}
export function fmtU(b, d, max = 6) {
  const s = b.toString().padStart(d + 1, "0");
  let i = s.slice(0, -d) || "0";
  const f = s.slice(-d).replace(/0+$/, "").slice(0, max);
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return f ? `${i}.${f}` : i;
}
export function ago(t) {
  const s = (Date.now() - new Date(t)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

// JSON-RPC: public nodes first, then the connected wallet as a fallback.
export async function rpc(net, method, params = []) {
  let err;
  for (const u of NETS[net].rpc) {
    try {
      const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      return j.result;
    } catch (e) { err = e; }
  }
  const eth = window.ethereum;
  if (eth) {
    try {
      const c = await eth.request({ method: "eth_chainId" });
      if (parseInt(c, 16) === net) return await eth.request({ method, params });
    } catch (e) { err = e; }
  }
  throw new Error(`Couldn’t reach ${NETS[net].full}. ${err?.message || ""}`.trim());
}

export async function getBalance(net, asset, a) {
  if (asset === "ETH") return BigInt(await rpc(net, "eth_getBalance", [a, "latest"]));
  const data = "0x70a08231" + a.slice(2).toLowerCase().padStart(64, "0");
  return BigInt(await rpc(net, "eth_call", [{ to: NETS[net].usdc, data }, "latest"]));
}
export async function getGas(net) {
  try { return BigInt(await rpc(net, "eth_gasPrice")); } catch { return null; }
}
export async function getEthPrice() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    return (await r.json()).ethereum.usd;
  } catch { return null; }
}
// Recent transactions need an indexer (Blockscout). Throws if unreachable.
export async function getTxs(net, asset, a) {
  const n = NETS[net], al = a.toLowerCase(), tok = asset === "USDC";
  const url = tok ? `${n.bs}/api/v2/addresses/${a}/token-transfers?type=ERC-20&token=${n.usdc}`
                  : `${n.bs}/api/v2/addresses/${a}/transactions`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("indexer");
  const j = await r.json();
  return (j.items || []).slice(0, 20).map((t) => {
    const from = (t.from?.hash || "").toLowerCase();
    return { hash: tok ? t.transaction_hash || t.tx_hash : t.hash, out: from === al,
      peer: from === al ? t.to?.hash || "" : t.from?.hash || "",
      value: BigInt(tok ? t.total?.value || 0 : t.value || 0), time: t.timestamp,
      failed: !tok && t.status && t.status !== "ok" };
  });
}
export const padAddr = (a) => a.slice(2).toLowerCase().padStart(64, "0");
export const padHex = (b) => b.toString(16).padStart(64, "0");
