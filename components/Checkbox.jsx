/** A checkbox with its label. The tick wipes in when checked. */
export function Checkbox({children, className, ...props}) {
  return (
    <label className={["check", className].filter(Boolean).join(" ")}>
      <input type="checkbox" {...props} />
      {children}
    </label>
  );
}
