import { short } from "./lib/chain.js";

export function Seg({ opts, val, onChange }) {
  return (
    <div className="seg">
      {opts.map(([v, l]) => (
        <button key={v} className={v === val ? "on" : ""} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
export const Field = ({ label, children }) => (
  <label className="f"><span className="lbl">{label}</span>{children}</label>
);
export const Skeleton = () => <><div className="sk" /><div className="sk" /></>;

export function copy(text, say) {
  navigator.clipboard?.writeText(text).then(() => say?.("Copied"), () => say?.("Copy failed"));
}
export function AddrPicker({ contacts, onPick }) {
  if (!contacts.length) return null;
  return (
    <div className="chips">
      {contacts.map((c) => (
        <button key={c.addr} className="chip" onClick={() => onPick(c.addr)} title={c.addr}>★ {c.label}</button>
      ))}
    </div>
  );
}
export function TxRow({ x, c }) {
  const { asset, n } = c;
  const d = asset === "ETH" ? 18 : 6;
  return (
    <div className="tx">
      <div className={"ar " + (x.out ? "out" : "in")}>{x.out ? "↑" : "↓"}</div>
      <div className="m">
        <span className="mono">{x.out ? "To " : "From "}{short(x.peer || "0x0000000000000000")}</span>
        <small>{x.time} {x.failed ? "· failed " : ""}· <a href={`${n.scan}/tx/${x.hash}`} target="_blank" rel="noopener noreferrer">view</a></small>
      </div>
      <div className="amt mono" style={{ color: x.out ? "var(--bad)" : "var(--ok)" }}>{x.out ? "−" : "+"}{x.amount} {asset}</div>
    </div>
  );
}
