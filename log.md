18:09:27.778 Running build in Washington, D.C., USA (East) – iad1
18:09:27.779 Build machine configuration: 2 cores, 8 GB
18:09:27.826 Cloning github.com/tejvirmann/my-nba-fantasy (Branch: main, Commit: c874bbf)
18:09:27.828 Skipping build cache, deployment was triggered without cache.
18:09:28.252 Cloning completed: 426.000ms
18:09:28.764 Running "vercel build"
18:09:28.777 Vercel CLI 65.1.0
18:09:29.516 Installing dependencies...
18:09:30.154 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
18:09:33.695 npm warn deprecated @esbuild-kit/esm-loader@2.6.5: Merged into tsx: https://tsx.hirok.io
18:09:33.743 npm warn deprecated @esbuild-kit/core-utils@3.3.2: Merged into tsx: https://tsx.hirok.io
18:09:36.602 npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.
18:09:41.180
18:09:41.180 added 379 packages in 12s
18:09:41.180
18:09:41.181 152 packages are looking for funding
18:09:41.181   run `npm fund` for details
18:09:41.182 npm warn install-scripts 4 packages have install scripts not yet covered by allowScripts:
18:09:41.182 npm warn install-scripts   esbuild@0.18.20 (postinstall: node install.js)
18:09:41.182 npm warn install-scripts   esbuild@0.25.12 (postinstall: node install.js)
18:09:41.182 npm warn install-scripts   esbuild@0.28.2 (postinstall: node install.js)
18:09:41.182 npm warn install-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
18:09:41.182 npm warn install-scripts
18:09:41.182 npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
18:09:41.234 Running "npm run build"
18:09:41.379 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
18:09:41.398
18:09:41.398 > my-nba-fantasy@0.1.0 build
18:09:41.398 > next build --turbopack
18:09:41.398
18:09:42.490 Attention: Next.js now collects completely anonymous telemetry regarding usage.
18:09:42.491 This information is used to shape Next.js' roadmap and prioritize features.
18:09:42.491 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
18:09:42.491 https://nextjs.org/telemetry
18:09:42.491
18:09:42.624    ▲ Next.js 15.5.28 (Turbopack)
18:09:42.624
18:09:42.717    Creating an optimized production build ...
18:09:58.361  ✓ Finished writing to disk in 46ms
18:09:58.398  ✓ Compiled successfully in 15.0s
18:09:58.407    Linting and checking validity of types ...
18:10:08.865    Collecting page data ...
18:10:09.679    Generating static pages (0/15) ...
18:10:10.380    Generating static pages (3/15)
18:10:10.381    Generating static pages (7/15)
18:10:10.494    Generating static pages (11/15)
18:10:10.555  ✓ Generating static pages (15/15)
18:10:10.763    Finalizing page optimization ...
18:10:10.767    Collecting build traces ...
18:10:16.822
18:10:16.843 Route (app)                         Size  First Load JS
18:10:16.843 ┌ ƒ /                                0 B         118 kB
18:10:16.843 ├ ƒ /_not-found                      0 B         115 kB
18:10:16.843 ├ ƒ /account                     4.71 kB         120 kB
18:10:16.843 ├ ƒ /admin                           0 B         119 kB
18:10:16.843 ├ ƒ /api/cron/sync                   0 B            0 B
18:10:16.843 ├ ƒ /auth/callback                   0 B            0 B
18:10:16.844 ├ ƒ /forgot-password                 0 B         118 kB
18:10:16.844 ├ ƒ /install                         0 B         118 kB
18:10:16.844 ├ ƒ /join                            0 B         119 kB
18:10:16.844 ├ ƒ /league/[id]                     0 B         120 kB
18:10:16.844 ├ ƒ /league/[id]/activity            0 B         120 kB
18:10:16.844 ├ ƒ /league/[id]/draft           1.38 kB         120 kB
18:10:16.844 ├ ƒ /league/[id]/players             0 B         120 kB
18:10:16.844 ├ ƒ /league/[id]/settings            0 B         119 kB
18:10:16.844 ├ ƒ /league/[id]/standings           0 B         119 kB
18:10:16.844 ├ ƒ /league/[id]/team            1.71 kB         120 kB
18:10:16.844 ├ ƒ /league/[id]/trades              0 B         119 kB
18:10:16.844 ├ ƒ /leagues/new                     0 B         119 kB
18:10:16.844 ├ ƒ /login                           0 B         119 kB
18:10:16.845 ├ ○ /manifest.webmanifest            0 B            0 B
18:10:16.845 ├ ƒ /pwa-icon/[size]                 0 B            0 B
18:10:16.845 └ ƒ /signup                          0 B         119 kB
18:10:16.845 + First Load JS shared by all     125 kB
18:10:16.845   ├ chunks/385f507bdd320569.js   21.3 kB
18:10:16.845   ├ chunks/841f20390e229d44.js   59.2 kB
18:10:16.845   ├ chunks/c20516c263ef3a09.js   17.2 kB
18:10:16.845   ├ chunks/fe0c46a0bff4dc6e.css  10.6 kB
18:10:16.845   └ other shared chunks (total)  17.1 kB
18:10:16.845
18:10:16.845
18:10:16.845 ƒ Middleware                     97.6 kB
18:10:16.845
18:10:16.846 ○  (Static)   prerendered as static content
18:10:16.846 ƒ  (Dynamic)  server-rendered on demand
18:10:16.846
18:10:16.953 Build Completed in /vercel/output [47s]
18:10:16.974 Deploying outputs...
18:10:18.044 Deployment completed
18:10:18.048 Creating build cache...
18:10:33.236 Created build cache: 15s
18:10:33.236 Uploading build cache [140.20 MB]
18:10:36.009 Build cache uploaded: 2.772s
