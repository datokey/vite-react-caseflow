import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./themeContext";

const STORAGE_KEY = "theme";
const THEMES = {
  light: "light",
  dark: "dark",
};

const getStoredTheme = () => {
  if (typeof window === "undefined") return THEMES.light;

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return storedTheme === THEMES.dark ? THEMES.dark : THEMES.light;
  } catch {
    return THEMES.light;
  }
};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === THEMES.dark);
  document.documentElement.dataset.theme = theme;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme class tetap diterapkan walau penyimpanan browser dibatasi.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) =>
      currentTheme === THEMES.dark ? THEMES.light : THEMES.dark,
    );
  }, []);

  const value = useMemo(
    () => ({
      isDarkMode: theme === THEMES.dark,
      setTheme,
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
