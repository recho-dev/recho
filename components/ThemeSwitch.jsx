"use client";
import {useEffect, useState} from "react";
import {Monitor, Moon, Sun} from "lucide-react";
import {Button} from "./Button.jsx";

const STORAGE_KEY = "theme";

// Each click moves to the next mode.
const MODES = [
  {value: "dark", label: "Dark", Icon: Moon},
  {value: "light", label: "Light", Icon: Sun},
  {value: "system", label: "System", Icon: Monitor},
];

/**
 * Sets data-theme on <html> before the page paints, from the saved choice, so
 * a light or dark choice doesn't flash the system theme first. tokens.css
 * reads the attribute; without it the system theme applies.
 */
export const themeScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** A button that turns through dark, light and system themes, and remembers the choice. */
export function ThemeSwitch({iconProps}) {
  // Read after mount: the server can't know the saved choice.
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const theme = document.documentElement.dataset.theme;
    setMode(theme === "light" || theme === "dark" ? theme : "system");
  }, []);

  function next() {
    const index = MODES.findIndex((m) => m.value === mode);
    const value = MODES[(index + 1) % MODES.length].value;
    const root = document.documentElement;
    // Transitions pause for a frame, so nothing lags behind the swap.
    root.classList.add("no-motion");
    if (value === "system") delete root.dataset.theme;
    else root.dataset.theme = value;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-motion")));
    try {
      if (value === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage can be blocked; the choice then lasts until the page reloads.
    }
    setMode(value);
  }

  const current = MODES.find((m) => m.value === mode) ?? MODES[2];
  return (
    <Button variant="ghost" icon tip={`Theme: ${current.label}`} onClick={next}>
      <current.Icon {...iconProps} />
    </Button>
  );
}
