import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served at domain root on Vercel.
export default defineConfig({
  plugins: [react()],
});
