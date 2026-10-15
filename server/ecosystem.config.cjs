// pm2 processes on the API server (pm2 start server/ecosystem.config.cjs && pm2 save):
//   offscreen-api     this Next.js app, answering /api/* at api.offscreen.wtf (the pages are on
//                     Cloudflare); settings in .env.production next to it
//   offscreen-images  the public wallpaper images at images.offscreen.wtf
const os = require('os');
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'offscreen-api',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 4101',
      instances: 1,
      max_memory_restart: '1200M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'offscreen-images',
      script: 'server/images.mjs',
      env: { PORT: '4103', IMAGES_DIR: path.join(os.homedir(), 'data/images') },
    },
  ],
};
