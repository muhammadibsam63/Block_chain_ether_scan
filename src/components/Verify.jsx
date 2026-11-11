import { useState } from "react";
import { rpc, isAddr, isHash, parseU, fmtU, decimals, TRANSFER, short } from "../lib/chain.js";
import { Field, Skeleton, AddrPicker, copy } from "../ui.jsx";

export default function Verify({ c }) {
  const { net, asset, n, say, contacts, setLog } = c;
  const p = c.prefill;
  const [to, setTo] = useState(p.to || "");
  const [amt, setAmt] = useState(p.amt || "");
  const [hash, setHash] = useState(p.hash || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const d = decimals(asset);

  async function verify() {
    setErr(""); setRes(null);
    if (!isAddr(to.trim())) return setErr("Enter a valid receiving address.");
    if (!isHash(hash.trim())) return setErr("Enter a valid transaction hash (0x + 64 characters).");
    if (asset === "USDC" && !n.usdc) return setErr(`USDC isn’t configured on ${n.full}.`);
    let want; try { want = parseU(amt, d, asset); } catch (e) { return setErr(e.message); }
    const a = to.trim().toLowerCase(), h = hash.trim();
    setBusy(true);
    try {
      const [tx, rc] = await Promise.all([rpc(net, "eth_getTransactionByHash", [h]), rpc(net, "eth_getTransactionReceipt", [h])]);
      if (!tx) setRes({ kind: "bad", title: "Transaction not found", checks: [[false, `No transaction with this hash exists on ${n.full}. Check the network and hash.`]] });
      else if (!rc) setRes({ kind: "wait", title: "Still pending", checks: [[null, "The transaction is known but not mined yet. Check again in a minute."]] });
      else {
        const checks = [[rc.status === "0x1", rc.status === "0x1" ? "Transaction succeeded" : "Transaction failed on chain"]];
        let got = 0n, match = false;
        if (asset === "ETH") {
          match = (tx.to || "").toLowerCase() === a; got = BigInt(tx.value);
          checks.push([match, match ? "Receiver matches" : `Receiver is ${short(tx.to || "0x0")}, not your wallet`]);
          if (tx.input && tx.input !== "0x") checks.push([false, "This is a contract call, not a plain ETH transfer"]);
        } else {
          const logs = (rc.logs || []).filter((l) => l.address.toLowerCase() === n.usdc.toLowerCase() && l.topics[0] === TRANSFER && l.topics[2] && ("0x" + l.topics[2].slice(-40)).toLowerCase() === a);
          match = logs.length > 0; got = logs.reduce((s, l) => s + BigInt(l.data), 0n);
          checks.push([match, match ? "USDC transfer to your wallet found in the receipt" : "No USDC transfer to this wallet in the receipt"]);
        }
        const ok = got === want;
        checks.push([ok, ok ? `Amount matches (${fmtU(want, d, 8)} ${asset})` : `Received ${fmtU(got, d, 8)} ${asset}, expected ${fmtU(want, d, 8)}`]);
        let conf = 0; try { conf = Number(BigInt(await rpc(net, "eth_blockNumber")) - BigInt(rc.blockNumber) + 1n); } catch {}
        const all = checks.every((x) => x[0]);
        setRes({ kind: all ? "ok" : "bad", title: all ? "Payment landed" : "This doesn’t match", checks, conf, h });
        setLog((l) => [{ t: Date.now(), kind: "verify", h, to: to.trim(), ok: all, asset, net, amt: fmtU(want, d, 8) }, ...l].slice(0, 50));
      }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const receipt = () => res && copy(
    `EtherReceipt\n${res.title}\nNetwork: ${n.full}\nAsset: ${asset}\nReceiver: ${to}\nExpected: ${amt} ${asset}\nTx: ${hash}\nConfirmations: ${res.conf ?? "-"}\n${res.checks.map((x) => (x[0] ? "✓ " : "✕ ") + x[1]).join("\n")}\nChecked: ${new Date().toISOString()}`, say);

  return (
    <section className="card">
      <h2>Did the right payment arrive?</h2>
      <p className="d">Match a transaction to the wallet and amount you expected.</p>
      <Field label="Receiving wallet address"><input className="mono" value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" spellCheck="false" /></Field>
      <AddrPicker contacts={contacts} onPick={setTo} />
      <div className="two">
        <Field label={`Expected amount (${asset})`}><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></Field>
        <Field label="Transaction hash"><input className="mono" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="0x…" spellCheck="false" /></Field>
      </div>
      <button className="btn" disabled={busy} onClick={verify}>{busy ? "Checking…" : "Verify payment"}</button>
      {err && <div className="err">{err}</div>}
      {busy && <Skeleton />}
      {res && (
        <div className={"res " + res.kind}>
          <h3>{res.kind === "ok" ? "✓" : res.kind === "wait" ? "…" : "✕"} {res.title}</h3>
          {res.checks.map((x, i) => <div className="chk" key={i}><b className={x[0] === false ? "x" : ""}>{x[0] === false ? "✕" : x[0] ? "✓" : "…"}</b><span>{x[1]}</span></div>)}
          {res.h && (
            <div className="row" style={{ marginTop: 12 }}>
              {res.conf != null && <span className="note">{res.conf} confirmations</span>}
              <a className="ghost" href={`${n.scan}/tx/${res.h}`} target="_blank" rel="noopener noreferrer">Explorer</a>
              <button className="ghost" onClick={receipt}>Copy receipt</button>
              <button className="ghost" onClick={() => window.print()}>Print</button>
            </div>)}
        </div>)}
    </section>
  );
}
