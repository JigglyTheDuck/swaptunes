import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Jiggly",
        short_name: "Jiggly",
        description: "Jiggly music composer",
        icons: [
          {
            src: "/favicon-md.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon-lg.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        // other manifest properties
      },
    }),
  ],
});
