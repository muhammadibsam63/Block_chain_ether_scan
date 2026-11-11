import { useState } from "react";
import { NETS, isAddr, short } from "../lib/chain.js";
import { Field, copy } from "../ui.jsx";

export default function Book({ c }) {
  const { contacts, setContacts, log, setLog, go, say } = c;
  const [label, setLabel] = useState("");
  const [addr, setAddr] = useState("");
  const [err, setErr] = useState("");
  function add() {
    if (!label.trim()) return setErr("Give this contact a name.");
    if (!isAddr(addr.trim())) return setErr("Enter a valid address.");
    setContacts([...contacts, { label: label.trim(), addr: addr.trim() }]); setLabel(""); setAddr(""); setErr(""); say("Contact saved");
  }
  const exportJson = () => {
    const b = new Blob([JSON.stringify({ contacts, log }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "etherreceipt-backup.json"; a.click();
  };
  return (
    <div className="stack">
      <section className="card">
        <h2>Contacts</h2>
        <p className="d">Save the wallets you get paid by or pay. They’re stored only in this browser.</p>
        <div className="two">
          <Field label="Name"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ali – design client" /></Field>
          <Field label="Address"><input className="mono" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" spellCheck="false" /></Field>
        </div>
        <button className="btn" onClick={add}>Save contact</button>
        {err && <div className="err">{err}</div>}
        {contacts.length === 0 && <div className="msg">No contacts yet. Save one above, or from any wallet lookup.</div>}
        {contacts.map((x) => (
          <div className="tx" key={x.addr}>
            <div className="ar in">★</div>
            <div className="m"><b>{x.label}</b><small className="mono">{short(x.addr)}</small></div>
            <div className="row">
              <button className="ghost" onClick={() => go("wallet", { addr: x.addr })}>Look up</button>
              <button className="ghost" onClick={() => go("send", { to: x.addr })}>Send</button>
              <button className="ghost" onClick={() => copy(x.addr, say)}>Copy</button>
              <button className="ghost" onClick={() => setContacts(contacts.filter((y) => y.addr !== x.addr))} aria-label={"Delete " + x.label}>✕</button>
            </div>
          </div>))}
      </section>
      <section className="card">
        <h2>Activity log</h2>
        <p className="d">Payments you sent and checks you ran from this browser.</p>
        {log.length === 0 && <div className="msg">Nothing here yet. Send or verify a payment and it will show up.</div>}
        {log.map((x, i) => (
          <div className="tx" key={i}>
            <div className={"ar " + (x.kind === "send" ? "out" : x.ok ? "in" : "out")}>{x.kind === "send" ? "↑" : x.ok ? "✓" : "✕"}</div>
            <div className="m">{x.kind === "send" ? "Sent" : x.ok ? "Verified" : "Mismatch"} {x.amt} {x.asset} on {NETS[x.net].name}
              <small>{new Date(x.t).toLocaleString()} · <a href={`${NETS[x.net].scan}/tx/${x.h}`} target="_blank" rel="noopener noreferrer">view</a></small></div>
            <button className="ghost" onClick={() => go("verify", { hash: x.h, to: x.to || "", amt: x.amt })}>Re-check</button>
          </div>))}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="ghost" onClick={exportJson}>Export backup</button>
          {log.length > 0 && <button className="ghost" onClick={() => setLog([])}>Clear log</button>}
        </div>
      </section>
    </div>
  );
}
