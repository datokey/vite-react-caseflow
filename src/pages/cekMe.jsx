import { useEffect, useState } from "react";

const AUTH_ME_ENDPOINT = import.meta.env.VITE_ENDPOINT_AUTH_ME || "/api/auth/me";

export default function CekMe() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetch(AUTH_ME_ENDPOINT, { credentials: "include" })
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
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-300">
            Akun
          </p>
          <h1 className="mt-2 text-3xl font-black">Profile</h1>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading && <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Loading...</p>}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && (
            <div>
              {user ? (
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {JSON.stringify(user, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No user data available.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
