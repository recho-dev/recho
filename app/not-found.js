import Link from "next/link";
import {Button} from "../components/Button.jsx";

export default function NotFound() {
  return (
    <div className="empty">
      <h1>404</h1>
      <p>This page could not be found.</p>
      <Button as={Link} variant="primary" href="/">
        Go to home
      </Button>
    </div>
  );
}
