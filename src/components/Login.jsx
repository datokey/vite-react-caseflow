import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { isPasswordChangeRequired } from "../lib/authUtils";

const LOGIN_FORM = {
  email: "",
  password: "",
};

const REGISTER_FORM = {
  confirmPassword: "",
  email: "",
  password: "",
  username: "",
};

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20 dark:[color-scheme:dark]";

const getFriendlyAuthError = (message, fallback) => {
  const normalizedMessage = String(message || "").toLowerCase();

  if (
    normalizedMessage.includes("token") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("authentication")
  ) {
    return "Sesi login sudah berakhir, silakan login kembali.";
  }

  return message || fallback;
};

const Login = ({ setCloseModal }) => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(LOGIN_FORM);
  const [registerForm, setRegisterForm] = useState(REGISTER_FORM);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegisterMode = mode === "register";

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const showLogin = () => {
    setMode("login");
    setError("");
  };

  const showRegister = () => {
    setMode("register");
    setError("");
    setSuccessMessage("");
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await login(loginForm);

    if (result.success) {
      if (isPasswordChangeRequired(result.user)) {
        showToast("Login berhasil. Silakan ganti password terlebih dahulu.", "success");
        navigate("/cek-me", { replace: true });
      } else {
        showToast("Login berhasil.", "success");
      }
      setLoginForm(LOGIN_FORM);
      setCloseModal?.();
    } else {
      const message = getFriendlyAuthError(result.error, "Email atau password salah.");
      setError(message);
      showToast(message, "error");
    }

    setIsSubmitting(false);
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (registerForm.password !== registerForm.confirmPassword) {
      const message = "Konfirmasi password tidak sama.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      email: registerForm.email,
      password: registerForm.password,
      username: registerForm.username,
    });

    if (result.success && result.user) {
      showToast("Registrasi berhasil.", "success");
      setRegisterForm(REGISTER_FORM);
      setCloseModal?.();
    } else if (result.success) {
      const message = "Registrasi berhasil. Silakan login dengan akun baru Anda.";
      showToast(message, "success");
      setSuccessMessage(message);
      setLoginForm({ email: registerForm.email, password: "" });
      setRegisterForm(REGISTER_FORM);
      setMode("login");
    } else {
      const message = getFriendlyAuthError(result.error, "Registrasi gagal, silakan coba lagi.");
      setError(message);
      showToast(message, "error");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
      <h2 className="mb-2 text-center text-2xl font-bold text-slate-800 dark:text-white">
        {isRegisterMode ? "Registrasi Akun" : "Login Akun"}
      </h2>
      <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {isRegisterMode
          ? "Buat akun baru untuk mengakses Buku SOP."
          : "Masuk untuk membuka data SOP dan fitur kerja."}
      </p>

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {isRegisterMode ? (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-username" className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Username / Nama
            </label>
            <input
              id="register-username"
              name="username"
              type="text"
              value={registerForm.username}
              onChange={handleRegisterChange}
              className={inputClassName}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              value={registerForm.email}
              onChange={handleRegisterChange}
              className={inputClassName}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              value={registerForm.password}
              onChange={handleRegisterChange}
              className={inputClassName}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Konfirmasi Password
            </label>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              value={registerForm.confirmPassword}
              onChange={handleRegisterChange}
              className={inputClassName}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:disabled:bg-indigo-500/40"
          >
            {isSubmitting ? "Memproses..." : "Registrasi"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={loginForm.email}
              onChange={handleLoginChange}
              className={inputClassName}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={handleLoginChange}
              className={inputClassName}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:disabled:bg-indigo-500/40"
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>
      )}

      <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        {isRegisterMode ? (
          <>
            Sudah punya akun?{" "}
            <button type="button" onClick={showLogin} className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
              Kembali ke Login
            </button>
          </>
        ) : (
          <>
            Belum punya akun?{" "}
            <button type="button" onClick={showRegister} className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
              Registrasi
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
