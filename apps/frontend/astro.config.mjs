// @ts-check
import process from "node:process";
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

  security: {
    // Behind a reverse proxy (Caddy) Astro itself runs on plain http inside
    // the container. Trusting X-Forwarded-* for the public host lets the CSRF
    // origin check pass and makes `clientAddress` the visitor's IP.
    // SITE_HOST is read at build time; unset (local dev) keeps the default.
    allowedDomains: process.env.SITE_HOST
      ? [{ hostname: process.env.SITE_HOST, protocol: "https" }]
      : [],
  },

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
