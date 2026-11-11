import { useState } from "react";
import { rpc, isAddr, parseU, fmtU, decimals, padAddr, padHex, getGas } from "../lib/chain.js";
import { Field, AddrPicker, copy } from "../ui.jsx";

export default function Send({ c }) {
  const { net, asset, n, acct, connect, say, contacts, setLog, go } = c;
  const [to, setTo] = useState(c.prefill.to || "");
  const [amt, setAmt] = useState("");
  const [err, setErr] = useState("");
  const [rv, setRv] = useState(null);
  const [sent, setSent] = useState(null);
  const d = decimals(asset);

  const buildTx = (r) => asset === "ETH"
    ? { from: acct, to: r.to, value: "0x" + r.amt.toString(16) }
    : { from: acct, to: n.usdc, data: "0xa9059cbb" + padAddr(r.to) + padHex(r.amt) };

  async function review() {
    setErr(""); setSent(null);
    if (!acct && !(await connect())) return;
    if (!isAddr(to.trim())) return setErr("Enter a valid receiver address.");
    if (asset === "USDC" && !n.usdc) return setErr(`USDC isn’t configured on ${n.full}.`);
    let a; try { a = parseU(amt, d, asset); if (a <= 0n) throw new Error("Amount must be greater than zero."); } catch (e) { return setErr(e.message); }
    const r = { to: to.trim(), amt: a, fee: null };
    setRv(r);
    try { // best-effort fee estimate (your wallet shows the exact maximum)
      const [gas, price] = await Promise.all([rpc(net, "eth_estimateGas", [buildTx(r)]), getGas(net)]);
      if (price) setRv({ ...r, fee: BigInt(gas) * price });
    } catch {}
  }
  async function confirm() {
    const r = rv; setRv(null);
    try {
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: n.hex }] }); }
      catch { throw new Error(`Switch your wallet to ${n.full} and try again.`); }
      const h = await window.ethereum.request({ method: "eth_sendTransaction", params: [buildTx(r)] });
      setSent({ h, to: r.to, amt });
      setLog((l) => [{ t: Date.now(), kind: "send", h, to: r.to, asset, net, amt: fmtU(r.amt, d, 18) }, ...l].slice(0, 50));
      say("Payment submitted");
    } catch (e) { setErr(e.code === 4001 ? "You rejected the request in your wallet." : e.message); }
  }
  return (
    <section className="card">
      <h2>Send a payment</h2>
      <p className="d">Enter a receiver and amount. You review the details here, then approve in your wallet.</p>
      <div className="kv"><span>Sending account</span><span className="mono">{acct || "No wallet connected"}</span></div>
      {!acct && <button className="ghost" style={{ margin: "12px 0" }} onClick={connect}>Connect wallet</button>}
      <Field label="Receiver address"><input className="mono" value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" spellCheck="false" /></Field>
      <AddrPicker contacts={contacts} onPick={setTo} />
      <Field label={`Amount (${asset})`}><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></Field>
      <button className="btn" onClick={review}>Review transfer</button>
      {err && <div className="err">{err}</div>}
      {sent && (
        <div className="res ok">
          <h3>✓ Submitted to the network</h3>
          <div className="chk mono" style={{ wordBreak: "break-all" }}>{sent.h}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <a className="ghost" href={`${n.scan}/tx/${sent.h}`} target="_blank" rel="noopener noreferrer">Explorer</a>
            <button className="ghost" onClick={() => copy(sent.h, say)}>Copy hash</button>
            <button className="ghost" onClick={() => go("verify", { to: sent.to, amt: sent.amt, hash: sent.h })}>Verify this payment</button>
          </div>
        </div>)}
      <p className="note">Your wallet keeps your private key. This site never asks for a seed phrase. {net === 1 ? "Mainnet uses real funds, so test on Sepolia first." : "You’re on a test network."}</p>
      {rv && (
        <div className="ov" onClick={() => setRv(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h2>Review transfer</h2>
            <p className="d">Check everything before approving in your wallet.</p>
            {[["Network", n.full + (net === 1 ? " (real funds)" : " (test)")], ["From", acct], ["To", rv.to], ["Amount", `${fmtU(rv.amt, d, 18)} ${asset}`],
              ["Estimated fee", rv.fee ? `${fmtU(rv.fee, 18, 6)} ETH` : "Shown in your wallet"]].map(([k, v]) => <div className="kv" key={k}><span>{k}</span><span className="mono">{v}</span></div>)}
            <div className="row" style={{ marginTop: 18 }}>
              <button className="ghost" style={{ flex: 1 }} onClick={() => setRv(null)}>Cancel</button>
              <button className="btn" style={{ flex: 2 }} onClick={confirm}>Confirm in wallet</button>
            </div>
          </div>
        </div>)}
    </section>
  );
}
