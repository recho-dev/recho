"use client";
import {useEffect} from "react";
import {Button} from "./Button.jsx";
import {cn} from "./cn.js";
import {usePopover, onArrowKeys} from "./usePopover.js";

/**
 * A dropdown menu. `trigger` is the content of its button (a ghost button by
 * default), and `children` its items: MenuItem, MenuLabel and MenuSeparator.
 * Items close the menu when chosen. The menu scales and fades in from the
 * trigger's corner; `align="left"` opens it to the right of a left-hand trigger.
 *
 * Pass `open` and `onOpenChange` to control it from outside.
 */
export function Menu({
  label,
  trigger,
  children,
  align = "right",
  className,
  buttonClassName,
  icon = false,
  tip,
  open: openProp,
  onOpenChange,
}) {
  const popover = usePopover({onClose: () => onOpenChange?.(false)});
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : popover.open;
  const setOpen = (value) => {
    popover.setOpen(value);
    onOpenChange?.(value);
  };

  // Keep the internal state (which closes on outside clicks) in step.
  useEffect(() => {
    if (controlled) popover.setOpen(openProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, openProp]);

  function onTriggerKeyDown(e) {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    setOpen(true);
    requestAnimationFrame(() => popover.ref.current?.querySelector(".menu-item")?.focus());
  }

  return (
    <div className={cn("menu-wrap", className)} ref={popover.ref}>
      <Button
        ref={popover.triggerRef}
        variant="ghost"
        icon={icon}
        tip={tip}
        className={buttonClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger}
      </Button>
      <div
        className={cn("menu", align === "left" && "left")}
        role="menu"
        aria-label={label}
        hidden={!open}
        onKeyDown={(e) => onArrowKeys(e, ".menu-item")}
        onClick={(e) => e.target.closest(".menu-item") && setOpen(false)}
      >
        {children}
      </div>
    </div>
  );
}

/** An item in a Menu. Pass `as` (e.g. a link component) to render a link. */
export function MenuItem({as: Component = "button", className, children, ...props}) {
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      role="menuitem"
      className={cn("menu-item", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/** A line of quiet text in a Menu, e.g. who is logged in. */
export function MenuLabel({children}) {
  return <div className="menu-label">{children}</div>;
}

export function MenuSeparator() {
  return <div className="menu-sep" role="separator" />;
}
