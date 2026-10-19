import "./global.css";
import {Nav} from "./Nav.jsx";
import {Toaster} from "../components/Toast.jsx";
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
        <Analytics
          scriptSrc="/_vercel/insights/script.js"
          viewEndpoint="/_vercel/insights/view"
          eventEndpoint="/_vercel/insights/event"
        />
      </body>
    </html>
  );
}
