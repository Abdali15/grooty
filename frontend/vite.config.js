import { defineConfig } from "vite";

export default defineConfig({
  server: { proxy: { "/api": "http://127.0.0.1:3000" } },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ["gsap", "gsap/ScrollTrigger", "gsap/SplitText"]
        }
      }
    }
  }
});
