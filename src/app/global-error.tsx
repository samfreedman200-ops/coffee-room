"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji'",
          background: "#faf7f2",
          color: "#1a1714",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500, margin: 0 }}>
            Coffee room is briefly out of order.
          </h1>
          <p style={{ color: "#6b635a", marginTop: "0.75rem" }}>
            Something at the top level threw an error. Try reloading.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid #e5ddd1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            try again
          </button>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                color: "#6b635a",
                marginTop: "1.5rem",
              }}
            >
              ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
