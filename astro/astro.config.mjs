import { defineConfig } from 'astro/config';

// Static output only. No SSR, no runtime fetch: the course catalogue is read
// at build time from src/data/manifest.json (vendored copy, refresh with
// `npm run data`).
export default defineConfig({
  output: 'static',
  base: '/homepage-astro',
  trailingSlash: 'never',
});
