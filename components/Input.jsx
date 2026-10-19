import {forwardRef} from "react";
import {cn} from "./cn.js";

/** A text field. `plain` drops the border, for a title inside a toolbar. */
export const Input = forwardRef(function Input({plain = false, className, ...props}, ref) {
  return <input ref={ref} type="text" className={cn("input", plain && "input-plain", className)} {...props} />;
});
