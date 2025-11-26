// dynamicTheme.ts
import { createTheme } from "@mui/material/styles";
import { baseTheme } from "./theme";

export function buildTheme(uiSettings: { theme?: "light" | "dark"; highContrast?: boolean; fontSize?: number }) {
  const isDark = uiSettings.theme === "dark";

  return createTheme({
    ...baseTheme,
    palette: {
      ...baseTheme.palette,
      mode: isDark ? "dark" : "light",
      ...(isDark
        ? {
            background: {
              default: "#121212", // global background
              paper: "#1e1e1e",   // surfaces like cards, appbar
            },
            text: {
              primary: "#ffffff",
              secondary: "#bbbbbb",
            },
          }
        : {
            background: {
              default: "#f5f5f5",
              paper: "#ffffff",
            },
            text: {
              primary: "#000000",
              secondary: "#333333",
            },
          }),
      ...(uiSettings.highContrast && {
        primary: { main: "#000000" },
        secondary: { main: "#ffffff" },
      }),
    },
    typography: {
      ...baseTheme.typography,
      fontSize: uiSettings.fontSize || 16,
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#1e1e1e" : baseTheme.palette.primary.main,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
          },
        },
      },
    },
  });
}
