import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { articleService } from "../services/articleService";
import { userService } from "../services/userService";

const toText = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const normalizeRoleLabel = (value) => toText(value).toLowerCase().replace(/[\s-]+/g, "_");

const roleValueToText = (value) => {
  if (!value || typeof value !== "object") return toText(value);

  return (
    toText(value.role) ||
    toText(value.name) ||
    toText(value.value) ||
    toText(value.title) ||
    toText(value.label)
  );
};

const canAccessAdminDashboard = (user) => {
  if (!user) return false;
  if (user.isAdmin || user.isSuperAdmin || user.is_admin || user.is_super_admin) return true;

  const roleSources = [
    user.role,
    user.userRole,
    user.roleName,
    user.type,
    user.accessLevel,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];

  return roleSources
    .map(roleValueToText)
    .map(normalizeRoleLabel)
    .some((role) => ["admin", "administrator", "super_admin", "superadmin"].includes(role));
};

const getUserId = (user) => toText(user?._id?.$oid) || toText(user?._id) || toText(user?.id);

const getUserName = (user) =>
  toText(user?.username) || toText(user?.name) || toText(user?.fullName) || toText(user?.email) || "-";

const getUserEmail = (user) => toText(user?.email) || toText(user?.mail) || "-";

const getUserRole = (user) =>
  roleValueToText(user?.role) ||
  roleValueToText(user?.userRole) ||
  roleValueToText(user?.roleName) ||
  "user";

function DashboardCard({ helper, label, value }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      {helper && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{helper}</p>}
    </section>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { loading: isAuthLoading, user } = useAuth();
  const { showToast } = useToast();
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const isAdmin = useMemo(() => canAccessAdminDashboard(user), [user]);
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: !isAuthLoading && isAdmin,
    queryFn: async () => {
      const [articles, userResult] = await Promise.all([
        articleService.getArticles(),
        userService.getUsers(),
      ]);

      return {
        articleTotal: Array.isArray(articles) ? articles.length : 0,
        users: userResult.users,
        userTotal: userResult.total,
      };
    },
    refetchOnWindowFocus: false,
  });

  const articleTotal = dashboardQuery.data?.articleTotal ?? 0;
  const users = dashboardQuery.data?.users ?? [];
  const userTotal = dashboardQuery.data?.userTotal ?? 0;
  const isLoading = dashboardQuery.isLoading || dashboardQuery.isFetching;

  const handleConfirmPromote = async () => {
    const target = roleTarget;
    const targetId = getUserId(target);

    if (!targetId) {
      showToast("ID user tidak ditemukan.", "error");
      setRoleTarget(null);
      return;
    }

    try {
      setIsUpdatingRole(true);
      await userService.updateUserRole(targetId, "admin");
      showToast(`${getUserName(target)} berhasil diubah menjadi admin.`, "success");
      setRoleTarget(null);
      await dashboardQuery.refetch();
    } catch (error) {
      showToast(error?.message || "Gagal mengubah role user.", "error");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-6xl">
          <AdminDashboardSkeleton />
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
        <section className="mx-auto max-w-2xl rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
          <p className="text-sm font-black uppercase text-rose-600 dark:text-rose-300">Akses Ditolak</p>
          <h1 className="mt-2 text-2xl font-black">Dashboard Admin hanya untuk admin.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Akun Anda tidak memiliki hak akses untuk membuka halaman ini.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Kembali ke Beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">Admin</p>
            <h1 className="mt-2 text-3xl font-black">Dashboard Admin</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ringkasan data SOP dan manajemen role user/agen.
            </p>
          </div>

          {dashboardQuery.isError && (
            <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {dashboardQuery.error?.message || "Gagal memuat dashboard admin."}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DashboardCard label="Total SOP" value={articleTotal} helper="Jumlah data SOP tersedia di sistem." />
            <DashboardCard label="Total User/Agen" value={userTotal} helper="Jumlah user atau agen terdaftar." />
          </div>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-lg font-black">Manajemen Role User</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ubah user biasa menjadi admin dengan konfirmasi.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-500 dark:text-slate-400">Nama</th>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-500 dark:text-slate-400">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-500 dark:text-slate-400">Role</th>
                    <th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-500 dark:text-slate-400">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                        Belum ada data user/agen.
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => {
                      const itemId = getUserId(item) || getUserEmail(item);
                      const role = getUserRole(item);
                      const normalizedRole = normalizeRoleLabel(role);
                      const isAlreadyAdmin = ["admin", "administrator", "super_admin", "superadmin"].includes(normalizedRole);

                      return (
                        <tr key={itemId} className="bg-white dark:bg-slate-900">
                          <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">{getUserName(item)}</td>
                          <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{getUserEmail(item)}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              disabled={isAlreadyAdmin}
                              onClick={() => setRoleTarget(item)}
                              className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                            >
                              {isAlreadyAdmin ? "Sudah Admin" : "Jadikan Admin"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">Konfirmasi Role</p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              Jadikan {getUserName(roleTarget)} sebagai admin?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              User ini akan mendapatkan akses ke fitur admin setelah role diubah.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isUpdatingRole}
                onClick={() => setRoleTarget(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUpdatingRole}
                onClick={handleConfirmPromote}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                {isUpdatingRole ? "Memproses..." : "Ya, Jadikan Admin"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
