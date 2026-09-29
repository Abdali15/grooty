import { defineConfig } from "vite";

export default defineConfig({
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
