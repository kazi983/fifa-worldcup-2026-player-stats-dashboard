// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: "standalone",
  }),

  output: "server",

  env: {
    schema: {
      API_BASE_URL: envField.string({
        // read only on server side
        context: "server",
        // not be exposed on client when it's built
        access: "secret",
      }),
    },
  },
});
