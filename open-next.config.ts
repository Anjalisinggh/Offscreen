// OpenNext adapter settings for Cloudflare Workers (see wrangler.jsonc). Pages are rendered per
// request; what the build pre-renders (the link-preview picture, app icons, sitemap) is served
// from the built files instead of being drawn again, which would take more CPU time than a
// Worker request gets.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
