import { useState, useEffect, useCallback } from "react";
import { NETS } from "./lib/chain.js";
import { useLocal } from "./lib/useLocal.js";
import { Seg, copy } from "./ui.jsx";
import Wallet from "./components/Wallet.jsx";
import Verify from "./components/Verify.jsx";
import Send from "./components/Send.jsx";
import Book from "./components/Book.jsx";

const TABS = [["wallet", "≋ Wallet"], ["verify", "✓ Verify"], ["send", "↗ Send"], ["book", "★ Contacts & log"]];

export default function App() {
  const [net, setNet] = useLocal("er_net", 1);
  const [asset, setAsset] = useLocal("er_asset", "ETH");
  const [theme, setTheme] = useLocal("er_theme", "dark");
  const [contacts, setContacts] = useLocal("er_contacts", []);
  const [recent, setRecent] = useLocal("er_recent", []);
  const [log, setLog] = useLocal("er_log", []);
  const [tab, setTab] = useState("wallet");
  const [prefill, setPrefill] = useState({});
  const [acct, setAcct] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const eth = window.ethereum; if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((a) => setAcct(a[0] || null)).catch(() => {});
    const h = (a) => setAcct(a[0] || null);
    eth.on?.("accountsChanged", h);
    return () => eth.removeListener?.("accountsChanged", h);
  }, []);

  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2200); }, []);
  const connect = async () => {
    if (!window.ethereum) { say("No browser wallet found. Install MetaMask or open this site in your wallet’s browser."); return false; }
    try { const a = await window.ethereum.request({ method: "eth_requestAccounts" }); setAcct(a[0]); return true; }
    catch { say("Wallet connection was cancelled."); return false; }
  };
  const go = (t, p = {}) => { setPrefill(p); setTab(t); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const n = NETS[net];
  const c = { net, asset, n, acct, connect, say, contacts, setContacts, recent, setRecent, log, setLog, prefill, go };
  const key = tab + JSON.stringify(prefill) + net + asset;

  return (
    <div className="wrap">
      <header>
        <div className="logo"><i>✓</i>EtherReceipt</div>
        <div className="row">
          <span className="pill"><span className="dot" />{n.full}</span>
          <button className="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀ Light" : "☾ Dark"}</button>
          <button className="ghost" onClick={acct ? () => copy(acct, say) : connect}>{acct ? acct.slice(0, 6) + "…" + acct.slice(-4) : "Connect wallet"}</button>
        </div>
      </header>

      <section className="hero">
        <h1>Good work deserves a <span>clear receipt.</span></h1>
        <p className="sub">Check that a payment landed, understand a wallet’s activity and send ETH or USDC on Mainnet, Sepolia and Hoodi.</p>
      </section>

      <div className="card ctrl">
        <div><span className="lbl">Network</span>
          <Seg val={net} onChange={setNet} opts={Object.values(NETS).map((x) => [x.id, x.name])} /></div>
        <div><span className="lbl">Payment asset</span>
          <Seg val={asset} onChange={setAsset} opts={[["ETH", "ETH"], ["USDC", "USDC"]]} /></div>
        <p className="note" style={{ gridColumn: "1/-1" }}>
          <b>{n.full}.</b> {net === 1 ? "Real funds. Lookups and checks are public; sending needs your wallet." : "Test network. Balances here are separate from Mainnet."}
          {asset === "USDC" && !n.usdc && <span style={{ color: "var(--warn)" }}> USDC isn’t configured on this network.</span>}
        </p>
      </div>

      <nav className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={k === tab ? "on" : ""} onClick={() => go(k)}>{l}</button>)}
      </nav>

      <main key={key}>
        {tab === "wallet" && <Wallet c={c} />}
        {tab === "verify" && <Verify c={c} />}
        {tab === "send" && <Send c={c} />}
        {tab === "book" && <Book c={c} />}
      </main>

      <div className="warn"><b>A useful check, a snapshot in time.</b> A mined match can still change after a chain reorganization. This tool doesn’t claim finality or verify who the sender is in real life, so keep your invoice records too.</div>
      <footer>EtherReceipt · Never enter a seed phrase or private key on any website.</footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
