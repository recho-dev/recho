import {forwardRef} from "react";
import {cn} from "./cn.js";

/**
 * A button in one of the shared variants: "primary" (one per view, Run),
 * "secondary", or "ghost" (toolbar and header actions). `icon` makes it square
 * for an icon alone, and `tip` gives it a tooltip and, if it has no other
 * name, its accessible name. Pass `as` to render a link with the same look.
 */
export const Button = forwardRef(function Button(
  {as: Component = "button", variant = "secondary", size, icon = false, tip, className, children, ...props},
  ref,
) {
  const isButton = Component === "button";
  return (
    <Component
      ref={ref}
      type={isButton ? "button" : undefined}
      className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", icon && "btn-icon", className)}
      data-tip={tip}
      aria-label={icon && tip && !props["aria-label"] ? tip : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});
