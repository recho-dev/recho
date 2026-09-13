"use client";

import {usePathname} from "next/navigation";
import {useState, useEffect, useRef, useSyncExternalStore} from "react";
import {SafeLink} from "./SafeLink.jsx";
import {cn} from "./cn.js";
import {authStore} from "./auth.js";
import {Plus, Share, Github, Menu, FolderCode, LogIn, CircleUser} from "lucide-react";
import {Tooltip} from "react-tooltip";

const styles = {
  linkIcon: "w-5 h-5",
  link: "hover:bg-gray-100 px-3 rounded-md text-sm h-8 font-medium inline-flex items-center",
  selectedLink: "bg-gray-100",
  tooltip: "text-sm z-999",
  dropdown:
    "absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px] z-50",
  dropdownItem: "block px-3 py-2 text-sm hover:bg-gray-100",
  dropdownItemSelected: "bg-gray-100",
  dropdownButton: "w-full text-left whitespace-nowrap",
  dropdownLabel: "px-3 py-2 text-xs text-gray-500 whitespace-nowrap",
};

export function Nav() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const authMenuRef = useRef(null);
  const auth = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getServerSnapshot);

  function handleUpload(e) {
    e.preventDefault();
    const confirm = window.confirm(
      `Make a Pull Request to share your notebook to Examples!\n- Input the filename\n- Copy the code\n- Click the "Commit changes" button`,
    );
    if (confirm) window.open("https://github.com/recho-dev/notebook/new/main/app/examples", "_blank");
  }

  function isSelected(path) {
    return pathname.startsWith(path);
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (authStore.getSnapshot().menuOpen && authMenuRef.current && !authMenuRef.current.contains(event.target)) {
        authStore.closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className={cn("flex justify-between items-center p-4 border-b border-gray-200")}>
      <div className={cn("flex md:gap-2 items-center ")}>
        <SafeLink href="/">
          <h1 className={cn("text-xl font-extrabold")}>Recho</h1>
        </SafeLink>
        {/* Desktop navigation */}
        <div className={cn("hidden md:flex gap-2 items-center")}>
          <SafeLink href="/docs" className={cn(styles.link, isSelected("/docs") && styles.selectedLink, "ml-3")}>
            Docs
          </SafeLink>
          <SafeLink href="/examples" className={cn(styles.link, isSelected("/examples") && styles.selectedLink)}>
            Examples
          </SafeLink>
          <SafeLink href="/news" className={cn(styles.link, isSelected("/news") && styles.selectedLink)}>
            News
          </SafeLink>
        </div>
        {/* Mobile navigation */}
        <div className={cn("md:hidden relative")} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(styles.link)}
            aria-label="More navigation options"
          >
            <Menu className={cn(styles.linkIcon)} />
          </button>
          {dropdownOpen && (
            <div className={cn(styles.dropdown)}>
              <SafeLink
                href="/docs"
                className={cn(styles.dropdownItem, isSelected("/docs") && styles.dropdownItemSelected)}
                onClick={() => setDropdownOpen(false)}
              >
                Docs
              </SafeLink>
              <SafeLink
                href="/examples"
                className={cn(styles.dropdownItem, isSelected("/examples") && styles.dropdownItemSelected)}
                onClick={() => setDropdownOpen(false)}
              >
                Examples
              </SafeLink>
              <SafeLink
                href="/news"
                className={cn(styles.dropdownItem, isSelected("/news") && styles.dropdownItemSelected)}
                onClick={() => setDropdownOpen(false)}
              >
                News
              </SafeLink>
            </div>
          )}
        </div>
      </div>
      <div className={cn("flex gap-2 items-center")}>
        <SafeLink
          href="/"
          className={cn(styles.link, pathname === "/" && styles.selectedLink)}
          data-tooltip-id="nav-tooltip"
          data-tooltip-content="Create new notebook"
        >
          <Plus className={cn(styles.linkIcon)} />
        </SafeLink>

        <SafeLink
          href="/works"
          className={cn(styles.link, pathname === "/works" && styles.selectedLink)}
          data-tooltip-id="nav-tooltip"
          data-tooltip-content="Open Notebooks"
        >
          <FolderCode className={cn(styles.linkIcon)} />
        </SafeLink>

        <a
          href="https://github.com/recho-dev/notebook/new/main/app/examples"
          onClick={handleUpload}
          target="_blank"
          rel="noreferrer"
          className={cn(styles.link)}
          data-tooltip-id="nav-tooltip"
          data-tooltip-content="Share to Examples"
        >
          <Share className={cn(styles.linkIcon)} />
        </a>
        <a
          href="https://github.com/recho-dev/notebook"
          target="_blank"
          rel="noreferrer"
          className={cn(styles.link)}
          data-tooltip-id="nav-tooltip"
          data-tooltip-content="Contribute to Recho"
          data-tooltip-place="bottom-end"
        >
          <Github className={cn(styles.linkIcon)} />
        </a>
        <div className={cn("relative")} ref={authMenuRef}>
          <button
            onClick={() => (auth.menuOpen ? authStore.closeMenu() : authStore.openMenu())}
            className={cn(styles.link, auth.menuOpen && styles.selectedLink)}
            aria-label={auth.user ? "Account" : "Log in"}
            data-tooltip-id="nav-tooltip"
            data-tooltip-content={auth.user ? "Account" : "Log in to save notebooks"}
            data-tooltip-place="bottom-end"
            data-tooltip-hidden={auth.menuOpen}
          >
            {auth.user?.photoURL ? (
              <img
                src={auth.user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className={cn("w-6 h-6 rounded-full")}
              />
            ) : auth.user ? (
              <CircleUser className={cn(styles.linkIcon)} />
            ) : (
              <LogIn className={cn(styles.linkIcon)} />
            )}
          </button>
          {auth.menuOpen && (
            <div className={cn(styles.dropdown)}>
              {auth.user ? (
                <>
                  <div className={cn(styles.dropdownLabel)}>{auth.user.email ?? auth.user.displayName}</div>
                  <button className={cn(styles.dropdownItem, styles.dropdownButton)} onClick={authStore.signOut}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <div className={cn(styles.dropdownLabel)}>Log in to save notebooks</div>
                  <button
                    className={cn(styles.dropdownItem, styles.dropdownButton)}
                    onClick={() => authStore.signIn("github")}
                  >
                    Continue with GitHub
                  </button>
                  <button
                    className={cn(styles.dropdownItem, styles.dropdownButton)}
                    onClick={() => authStore.signIn("google")}
                  >
                    Continue with Google
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Tooltip id="nav-tooltip" className={cn(styles.tooltip)} />
    </header>
  );
}
