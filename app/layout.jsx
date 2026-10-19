import "./global.css";
import {Nav} from "./Nav.jsx";
import {Toaster} from "../components/Toast.jsx";
import {Dialogs} from "../components/Dialog.jsx";
import {ThemeSync} from "../components/ThemeSync.jsx";
import {Analytics} from "@vercel/analytics/next";

export const metadata = {
  title: "Recho",
  description: "Recho - A interactive editor for algorithms and ASCII art",
};

export default function Layout({children}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <Toaster />
        <Dialogs />
        <ThemeSync />
        <Analytics
          scriptSrc="/_vercel/insights/script.js"
          viewEndpoint="/_vercel/insights/view"
          eventEndpoint="/_vercel/insights/event"
        />
      </body>
    </html>
  );
}
