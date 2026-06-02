import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

const INITIAL_FORM = {
  email: "",
  password: "",
};

const Login = ({ setCloseModal }) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(form);

    if (result.success) {
      showToast("Login berhasil.", "success");
      setForm(INITIAL_FORM);
      setCloseModal?.();
    } else {
      const message = result.error || "Email atau password tidak sesuai.";
      setError(message);
      showToast(message, "error");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl dark:bg-slate-900">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center dark:text-white">Login Akun</h2>
      <p className="text-sm text-slate-500 text-center mb-6 dark:text-slate-400">
        Masuk dengan akun yang sudah terdaftar.
      </p>

      {error && (
        <div className="mb-4 p-3 text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1 dark:text-slate-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1 dark:text-slate-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
};

export default Login;
