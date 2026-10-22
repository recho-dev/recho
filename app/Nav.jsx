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
  Github,
  Menu as MenuIcon,
  LogIn,
  CircleUser,
} from "lucide-react";
import {SafeLink} from "./SafeLink.jsx";
import {authStore} from "./auth.js";
import {LANGUAGES} from "./shared.js";
import {Button} from "../components/Button.jsx";
import {Menu, MenuItem, MenuLabel, MenuSeparator} from "../components/Menu.jsx";
import {ThemeSwitch} from "../components/ThemeSwitch.jsx";

const PAGES = [
  {href: "/explore", label: "Explore", Icon: LayoutGrid},
  {href: "/docs", label: "Docs", Icon: BookOpen},
  {href: "/news", label: "News", Icon: Newspaper},
];

const icon = {size: 16, strokeWidth: 1.75, className: "ic", "aria-hidden": true};

export function Nav() {
  const pathname = usePathname();
  const auth = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getServerSnapshot);

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
          {LANGUAGES.map(({runtime, label}) => (
            <MenuItem as={SafeLink} key={runtime} href="/" newRuntime={runtime}>
              {label}
            </MenuItem>
          ))}
        </Menu>
        <Button as={SafeLink} variant="ghost" className="act" href="/works" aria-current={current("/works")}>
          <FolderOpen {...icon} />
          <span className="lbl">Open</span>
        </Button>
        <span className="tb-sep" aria-hidden="true" />
        <ThemeSwitch iconProps={icon} />
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
