import { createTheme } from "@mui/material/styles";

export const baseTheme = createTheme({
  typography: {
    fontFamily: `"Montserrat", "Helvetica", "Arial", sans-serif`,
  },
  palette: {
    primary: {
      main: "#1f2225ff",
    },
    secondary: {
      main: "#ff4081",
    },
  },
});
