export const getAuthFlag = (user, keys = []) => {
  if (!user || typeof user !== "object") return false;

  return keys.some((key) => user[key] === true || user[key] === "true" || user[key] === 1 || user[key] === "1");
};

export const isPasswordChangeRequired = (user) =>
  getAuthFlag(user, [
    "mustChangePassword",
    "must_change_password",
    "mustResetPassword",
    "must_reset_password",
    "requirePasswordChange",
    "requiresPasswordChange",
  ]);
