import React, { useEffect, useState } from "react";

export default function CekMe() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const endpoint = (import.meta && import.meta.env && import.meta.env.VITE_ENDPOINT_AUTH_ME) || "/api/auth/me";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(endpoint, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText || "Failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setUser(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Error");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [endpoint]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Profile</h1>
      {loading && <p>Loading...</p>}
      {error && (
        <div style={{ color: "red" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {!loading && !error && (
        <div>
          {user ? (
            <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 6 }}>
              {JSON.stringify(user, null, 2)}
            </pre>
          ) : (
            <p>No user data available.</p>
          )}
        </div>
      )}
    </div>
  );
}
