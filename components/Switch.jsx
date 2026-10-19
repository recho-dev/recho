/** An on/off switch. Give it a label with `aria-label` or a wrapping <label>. */
export function Switch({className, ...props}) {
  return <input type="checkbox" role="switch" className={["switch", className].filter(Boolean).join(" ")} {...props} />;
}
