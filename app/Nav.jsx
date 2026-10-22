"use client";

import {usePathname} from "next/navigation";
import {useSyncExternalStore} from "react";
import {
  BookOpen,
  LayoutGrid,
  Newspaper,
  Plus,
  ChevronDown,
  FolderOpen,
  Share,
  Github,
  Menu as MenuIcon,
  LogIn,
  CircleUser,
} from "lucide-react";
import {SafeLink} from "./SafeLink.jsx";
import {authStore} from "./auth.js";
import {RUNTIMES} from "./shared.js";
import {Button} from "../components/Button.jsx";
import {Menu, MenuItem, MenuLabel, MenuSeparator} from "../components/Menu.jsx";

const PAGES = [
  {href: "/examples", label: "Examples", Icon: LayoutGrid},
  {href: "/docs", label: "Docs", Icon: BookOpen},
  {href: "/news", label: "News", Icon: Newspaper},
];

const NEW_NOTEBOOKS = [
  {runtime: RUNTIMES.javascript, label: "JavaScript"},
  {runtime: RUNTIMES.wenyan, label: "文言 wenyan"},
  {runtime: RUNTIMES.mlscript, label: "MLscript"},
];

const icon = {size: 16, strokeWidth: 1.75, className: "ic", "aria-hidden": true};

export function Nav() {
  const pathname = usePathname();
  const auth = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getServerSnapshot);

  function handleUpload(e) {
    e.preventDefault();
    const confirm = window.confirm(
      `Make a Pull Request to share your notebook to Examples!\n- Input the filename\n- Copy the code\n- Click the "Commit changes" button`,
    );
    if (confirm) window.open("https://github.com/recho-dev/notebook/new/main/app/examples", "_blank");
  }

  const current = (href) => (pathname.startsWith(href) ? "page" : undefined);

  return (
    <header className="appbar">
      <div className="appbar-in">
        <SafeLink href="/" className="wordmark">
          Recho
        </SafeLink>
        <nav className="nav-links" aria-label="Main">
          {PAGES.map(({href, label, Icon}) => (
            <SafeLink key={href} href={href} className="navlink" aria-current={current(href)}>
              <Icon {...icon} size={15} />
              {label}
            </SafeLink>
          ))}
        </nav>
        <Menu className="nav-more" label="Pages" icon align="left" trigger={<MenuIcon {...icon} />}>
          {PAGES.map(({href, label, Icon}) => (
            <MenuItem as={SafeLink} key={href} href={href} aria-current={current(href)}>
              <Icon {...icon} size={15} />
              {label}
            </MenuItem>
          ))}
        </Menu>
        <span className="spacer" />
        <Menu
          label="New notebook"
          buttonClassName="act"
          trigger={
            <>
              <Plus {...icon} />
              <span className="lbl">New</span>
              <ChevronDown {...icon} size={14} />
            </>
          }
        >
          {NEW_NOTEBOOKS.map(({runtime, label}) => (
            <MenuItem as={SafeLink} key={runtime} href="/" newRuntime={runtime}>
              {label}
            </MenuItem>
          ))}
        </Menu>
        <Button as={SafeLink} variant="ghost" className="act" href="/works" aria-current={current("/works")}>
          <FolderOpen {...icon} />
          <span className="lbl">Open</span>
        </Button>
        <Button
          as="a"
          variant="ghost"
          className="act"
          href="https://github.com/recho-dev/notebook/new/main/app/examples"
          onClick={handleUpload}
          target="_blank"
          rel="noreferrer"
          tip="Share to Examples"
        >
          <Share {...icon} />
          <span className="lbl">Share</span>
        </Button>
        <span className="tb-sep" aria-hidden="true" />
        <Button
          as="a"
          variant="ghost"
          icon
          href="https://github.com/recho-dev/notebook"
          target="_blank"
          rel="noreferrer"
          tip="Contribute to Recho"
        >
          <Github {...icon} />
        </Button>
        <Menu
          label={auth.user ? "Account" : "Log in"}
          tip={auth.user ? "Account" : "Log in to save notebooks"}
          icon
          open={auth.menuOpen}
          onOpenChange={(open) => (open ? authStore.openMenu() : authStore.closeMenu())}
          trigger={
            auth.user?.photoURL ? (
              <img src={auth.user.photoURL} alt="" referrerPolicy="no-referrer" className="avatar" />
            ) : auth.user ? (
              <CircleUser {...icon} />
            ) : (
              <LogIn {...icon} />
            )
          }
        >
          {auth.user ? (
            <>
              <MenuLabel>{auth.user.email ?? auth.user.displayName}</MenuLabel>
              <MenuSeparator />
              <MenuItem onClick={authStore.signOut}>Log out</MenuItem>
            </>
          ) : (
            <>
              <MenuLabel>Log in to save notebooks</MenuLabel>
              <MenuItem onClick={() => authStore.signIn("github")}>Continue with GitHub</MenuItem>
              <MenuItem onClick={() => authStore.signIn("google")}>Continue with Google</MenuItem>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
