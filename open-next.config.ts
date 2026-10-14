// OpenNext adapter settings for Cloudflare Workers (see wrangler.jsonc). The defaults suit this
// site: its pages are rendered per request, so there's no incremental cache to configure.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
