"use client";

export default function Error({error}) {
  console.error("Server RSC Error:", error, error.digest);
  return <div>Server Error</div>;
}
