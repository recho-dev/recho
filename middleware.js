import {NextResponse} from "next/server";

function authEnabled() {
  return Boolean(
    process.env.EVALUATION_ADMIN_USERNAME && process.env.EVALUATION_ADMIN_PASSWORD,
  );
}

function isProtectedRequest(request) {
  const {pathname} = request.nextUrl;

  if (pathname.startsWith("/evaluation/manage")) {
    return true;
  }

  if (pathname === "/api/evaluations/export" || pathname === "/api/evaluations/import") {
    return true;
  }

  if (pathname === "/api/evaluations" && request.method === "GET") {
    return true;
  }

  if (
    pathname.startsWith("/api/evaluations/") &&
    request.method === "GET" &&
    !pathname.endsWith("/tasks")
  ) {
    return true;
  }

  return false;
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Evaluation Admin"',
    },
  });
}

export function middleware(request) {
  if (!authEnabled() || !isProtectedRequest(request)) {
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const encoded = header.slice("Basic ".length);
  const decoded = atob(encoded);
  const index = decoded.indexOf(":");
  const username = index === -1 ? decoded : decoded.slice(0, index);
  const password = index === -1 ? "" : decoded.slice(index + 1);

  if (
    username !== process.env.EVALUATION_ADMIN_USERNAME ||
    password !== process.env.EVALUATION_ADMIN_PASSWORD
  ) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/evaluation/manage/:path*", "/api/evaluations/:path*"],
};
