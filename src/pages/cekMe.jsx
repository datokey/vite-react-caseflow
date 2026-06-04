import { useMemo, useState } from "react";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { isPasswordChangeRequired } from "../lib/authUtils";
import { authService } from "../services/authService";
import { userService } from "../services/userService";

const PROFILE_FIELDS = ["username", "email"];
const SENSITIVE_KEYS = new Set([
  "__v",
  "password",
  "passwordHash",
  "mustChangePassword",
  "must_change_password",
  "mustResetPassword",
  "must_reset_password",
  "requirePasswordChange",
  "requiresPasswordChange",
  "token",
  "accessToken",
  "refreshToken",
]);
const PROFILE_INFO_KEYS = new Set(["name", "username", "email"]);

const EMPTY_PASSWORD_FORM = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
};

const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "$date" in value) return toText(value.$date);
  if (typeof value === "object" && "$oid" in value) return toText(value.$oid);
  return "";
};

const getUserName = (user) =>
  toText(user?.name) || toText(user?.username) || toText(user?.fullName) || toText(user?.email) || "Pengguna";

const getUserRole = (user) =>
  toText(user?.role?.name) ||
  toText(user?.role?.role) ||
  toText(user?.role) ||
  toText(user?.userRole) ||
  toText(user?.roleName) ||
  "user";

const getRoleBadgeClass = (role) => {
  const normalizedRole = role.toLowerCase().replace(/[\s-]+/g, "_");

  if (["admin", "superadmin", "super_admin"].includes(normalizedRole)) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const getFriendlyError = (message, fallback) => {
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

const formatFieldLabel = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const formatFieldValue = (value) => {
  const textValue = toText(value);
  if (textValue) return textValue;

  if (Array.isArray(value)) return value.map((item) => toText(item?.name) || toText(item)).filter(Boolean).join(", ");
  if (value && typeof value === "object") return toText(value.name) || toText(value.username) || toText(value.email) || "-";

  return "-";
};

const getProfileValue = (user, key, draft, isDirty) => {
  if (isDirty && key in draft) return draft[key];
  return toText(user?.[key]);
};

function ProfileInfoItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">{value || "-"}</p>
    </div>
  );
}

export default function CekMe() {
  const { loading: isAuthLoading, refreshUser, user } = useAuth();
  const { showToast } = useToast();
  const [profileDraft, setProfileDraft] = useState({});
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isLoginRequired = !isAuthLoading && !user;
  const mustChangePassword = isPasswordChangeRequired(user);
  const role = getUserRole(user);
  const additionalInfo = useMemo(() => {
    if (!user) return [];

    return Object.entries(user)
      .filter(([key]) => !SENSITIVE_KEYS.has(key) && !PROFILE_INFO_KEYS.has(key))
      .map(([key, value]) => [key, formatFieldValue(value)])
      .filter(([, value]) => value && value !== "-")
      .slice(0, 8);
  }, [user]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setIsProfileDirty(true);
    setProfileDraft((currentDraft) => ({ ...currentDraft, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const payload = PROFILE_FIELDS.reduce((result, key) => {
      result[key] = getProfileValue(user, key, profileDraft, isProfileDirty);
      return result;
    }, {});

    try {
      setIsUpdatingProfile(true);
      await userService.updateProfile(payload);
      await refreshUser();
      setProfileDraft({});
      setIsProfileDirty(false);
      showToast("Profile berhasil diperbarui.", "success");
    } catch (error) {
      showToast(getFriendlyError(error?.message, "Gagal memperbarui profile."), "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordError("");
    setPasswordForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if ((mustChangePassword && !passwordForm.currentPassword) || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("Semua field password harus diisi.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password minimal 6 karakter.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Password baru dan konfirmasi password harus sama.");
      return;
    }

    try {
      setIsChangingPassword(true);
      if (mustChangePassword) {
        await authService.changePassword({
          confirmPassword: passwordForm.confirmPassword,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
      } else {
        await userService.changePassword({
          password: passwordForm.newPassword,
        });
      }
      await refreshUser();
      setPasswordForm(EMPTY_PASSWORD_FORM);
      showToast("Password berhasil diperbarui.", "success");
    } catch (error) {
      const message = getFriendlyError(error?.message, "Gagal mengganti password.");
      setPasswordError(message);
      showToast(message, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isAuthLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Memeriksa sesi login...
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">Akun</p>
            <h1 className="mt-2 text-3xl font-black">Profile User</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Kelola informasi akun dan keamanan login Anda.
            </p>
          </div>

          {user && (
            <div className="space-y-6">
              {mustChangePassword && (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="text-sm font-black uppercase">Wajib Ganti Password</p>
                  <p className="mt-2 text-sm leading-6">
                    Akun Anda sedang memakai password sementara. Silakan ganti password terlebih dahulu sebelum memakai fitur lain.
                  </p>
                </section>
              )}

              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-950 dark:text-white">{getUserName(user)}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${getRoleBadgeClass(role)}`}>
                        {role}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {toText(user?.email) || "Email belum tersedia"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ProfileInfoItem label="Nama" value={toText(user?.name) || getUserName(user)} />
                  <ProfileInfoItem label="Username" value={toText(user?.username)} />
                  <ProfileInfoItem label="Email" value={toText(user?.email)} />
                </div>

                {additionalInfo.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {additionalInfo.map(([key, value]) => (
                      <ProfileInfoItem key={key} label={formatFieldLabel(key)} value={value} />
                    ))}
                  </div>
                )}
              </section>

              <div className={`grid grid-cols-1 gap-6 ${mustChangePassword ? "" : "lg:grid-cols-2"}`}>
                {!mustChangePassword && (
                  <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">Edit Profile</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Perbarui username atau email akun Anda.
                  </p>

                  <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
                    {PROFILE_FIELDS.map((field) => (
                      <label key={field} className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {formatFieldLabel(field)}
                        </span>
                        <input
                          name={field}
                          type={field === "email" ? "email" : "text"}
                          value={getProfileValue(user, field, profileDraft, isProfileDirty)}
                          onChange={handleProfileChange}
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
                          required
                        />
                      </label>
                    ))}

                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300 dark:disabled:bg-indigo-500/40"
                    >
                      {isUpdatingProfile ? "Menyimpan..." : "Simpan Profile"}
                    </button>
                  </form>
                </section>
                )}

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">Ganti Password</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {mustChangePassword
                      ? "Masukkan password sementara, lalu buat password baru untuk menyelesaikan proses reset."
                      : "Gunakan password yang kuat dan jangan bagikan kepada siapa pun."}
                  </p>

                  {passwordError && (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                    {mustChangePassword && (
                      <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Password Sementara
                        </span>
                        <input
                          name="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          autoComplete="current-password"
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
                          required
                        />
                      </label>
                    )}

                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">
                        Password Baru
                      </span>
                      <input
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-600 dark:text-slate-300">
                        Konfirmasi Password Baru
                      </span>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-500"
                    >
                      {isChangingPassword ? "Memproses..." : "Ganti Password"}
                    </button>
                  </form>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      <AuthModal
        canClose={false}
        isOpen={isLoginRequired}
        message="Silakan login untuk membuka halaman profile."
      />
    </>
  );
}
