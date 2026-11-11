import { useState, useEffect } from "react";
import { isAddr, short, getBalance, getGas, getEthPrice, getTxs, fmtU, decimals, ago } from "../lib/chain.js";
import { Field, Skeleton, TxRow, AddrPicker, copy } from "../ui.jsx";

export default function Wallet({ c }) {
  const { net, asset, n, say, contacts, setContacts, recent, setRecent, go } = c;
  const [addr, setAddr] = useState(c.prefill.addr || "");
  const [data, setData] = useState(null);
  const [txs, setTxs] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const d = decimals(asset);

  async function lookup(a = addr) {
    a = a.trim(); setErr(""); setData(null); setTxs(null);
    if (!isAddr(a)) return setErr("Enter a valid public address: 0x followed by 40 hex characters.");
    if (asset === "USDC" && !n.usdc) return setErr(`USDC isn’t configured on ${n.full}.`);
    setBusy(true);
    try {
      const [bal, gas, price] = await Promise.all([getBalance(net, asset, a), getGas(net), net === 1 ? getEthPrice() : null]);
      const num = Number(fmtU(bal, d, 8).replace(/,/g, ""));
      const usd = net !== 1 ? null : asset === "USDC" ? num : price ? num * price : null;
      setData({ a, bal, gas, price, usd });
      setRecent([a, ...recent.filter((r) => r !== a)].slice(0, 5));
      getTxs(net, asset, a).then((rows) => setTxs(rows.map((r) => ({ ...r, amount: fmtU(r.value, d, 5), time: ago(r.time) })))).catch(() => setTxs("unavailable"));
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  useEffect(() => { if (c.prefill.addr) lookup(c.prefill.addr); /* eslint-disable-next-line */ }, []);
  const saved = data && contacts.some((x) => x.addr.toLowerCase() === data.a.toLowerCase());

  function save() {
    const label = prompt("Name for this wallet (e.g. Ali – design client)");
    if (label) { setContacts([...contacts, { label: label.trim(), addr: data.a }]); say("Saved to contacts"); }
  }
  return (
    <section className="card">
      <h2>See the bigger picture</h2>
      <p className="d">Live balance, dollar value and the latest 20 transactions for any public address.</p>
      <Field label="Public wallet address">
        <input className="mono" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" spellCheck="false"
          onKeyDown={(e) => e.key === "Enter" && lookup()} />
      </Field>
      <AddrPicker contacts={contacts} onPick={(a) => { setAddr(a); lookup(a); }} />
      {recent.length > 0 && (
        <div className="chips"><span className="note">Recent:</span>
          {recent.map((r) => <button key={r} className="chip mono" onClick={() => { setAddr(r); lookup(r); }}>{short(r)}</button>)}
        </div>)}
      <button className="btn" disabled={busy} onClick={() => lookup()}>{busy ? "Looking up…" : "Look up wallet"}</button>
      {err && <div className="err">{err}</div>}
      {busy && !data && <Skeleton />}
      {data && (
        <>
          <div className="stats">
            <div className="stat big"><span className="lbl">{asset} balance on {n.name}</span><b className="mono">{fmtU(data.bal, d, 6)}</b></div>
            <div className="stat"><span className="lbl">Dollar value</span><b>{data.usd != null ? "$" + data.usd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "–"}</b>
              <small>{net === 1 ? (data.price ? `ETH $${data.price.toLocaleString()}` : "Price unavailable") : "Test funds have no value"}</small></div>
            <div className="stat"><span className="lbl">Gas price</span><b>{data.gas ? Number(fmtU(data.gas, 9, 2)) + " gwei" : "–"}</b>
              <small>{data.gas && net === 1 && data.price ? "≈ $" + (((Number(data.gas) * 21000) / 1e18) * data.price).toFixed(2) + " for a simple send" : ""}</small></div>
          </div>
          <div className="row" style={{ margin: "16px 0" }}>
            <button className="ghost" onClick={() => copy(data.a, say)}>Copy address</button>
            <a className="ghost" href={`${n.scan}/address/${data.a}`} target="_blank" rel="noopener noreferrer">Explorer</a>
            {!saved && <button className="ghost" onClick={save}>★ Save contact</button>}
            <button className="ghost" onClick={() => go("send", { to: data.a })}>Send to this wallet</button>
          </div>
          <h3>Recent transactions</h3>
          {txs === null && <Skeleton />}
          {txs === "unavailable" && <div className="msg">History needs an indexer that isn’t reachable right now. Your balance is still live. Use Verify to check a specific transaction.</div>}
          {Array.isArray(txs) && (txs.length ? txs.map((x) => <TxRow key={x.hash + x.peer} x={x} c={c} />) : <div className="msg">No {asset} transactions found for this address.</div>)}
        </>
      )}
    </section>
  );
}
