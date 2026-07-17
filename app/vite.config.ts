import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is "/deadbolt/" on GitHub Pages (project site), "/" everywhere else.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "pages" ? "/deadbolt/" : "/",
}));
