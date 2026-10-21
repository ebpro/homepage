import { defineConfig } from 'astro/config';

// Static output only. No SSR, no runtime fetch: the course catalogue is read
// at build time from src/data/manifest.json (vendored copy, refresh with
// `npm run data`).
export default defineConfig({
  output: 'static',
  base: '/homepage-astro',
  trailingSlash: 'never',
  // Single self-contained HTML (deployed standalone behind the vai symlink):
  // inline the stylesheet into the page instead of emitting /_astro/*.css.
  build: { inlineStylesheets: 'always' },
});
