# @asteasolutions/tapestry-viewer

A prebuilt, static build of the Tapestry Viewer — a read-only web app for viewing Tapestry ZIP exports.
The package contains only static files (`dist/`), has no runtime dependencies and can be served
from any path by any web server or web framework.

## Install

```sh
npm install @asteasolutions/tapestry-viewer
```

## Serving the viewer

All asset URLs are relative, so you only need to serve the contents of
`node_modules/@asteasolutions/tapestry-viewer/dist` under a path of your choice, e.g. `/viewer/`.

> **Always link to `/viewer/index.html`** (or at least `/viewer/` with a trailing slash). Without the
> trailing slash the relative asset URLs resolve against the parent path and the viewer fails to load.
> Some dev servers (including Vite's) also don't serve `index.html` for directory URLs and fall back to
> the host app's own page, so `/viewer/index.html` is the only form that works everywhere.

**Vite** (with [`vite-plugin-static-copy`](https://www.npmjs.com/package/vite-plugin-static-copy) v4+),
works both in dev and in production builds:

```ts
viteStaticCopy({
  targets: [
    {
      src: 'node_modules/@asteasolutions/tapestry-viewer/dist/**/*',
      dest: 'viewer',
      // Strip the `node_modules/@asteasolutions/tapestry-viewer/dist` prefix but keep `assets/`
      rename: { stripBase: 4 },
    },
  ],
})
```

**Other stacks with a `public/` directory**: copy the files there, e.g. with a script in the host
app's `package.json` so they stay in sync with the installed version:

```json
"scripts": {
  "copy-viewer": "rm -rf public/viewer && cp -r node_modules/@asteasolutions/tapestry-viewer/dist public/viewer",
  "predev": "npm run copy-viewer",
  "prebuild": "npm run copy-viewer"
}
```

Consider adding `public/viewer` to `.gitignore`.

**Express**:

```ts
import { dirname } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const viewerDir = dirname(require.resolve('@asteasolutions/tapestry-viewer/dist/index.html'))
app.use('/viewer', express.static(viewerDir))
```

## Usage

- `/viewer/index.html` — shows an import screen where the user can drop a Tapestry ZIP.
- `/viewer/index.html?source=<url>` — loads the Tapestry ZIP at `<url>` directly. The URL must be reachable
  from the browser (same origin or CORS-enabled).

The viewer is designed to fill the whole page, so to embed it inside another page use an `<iframe>`:

```html
<iframe
  src="/viewer/index.html?source=/exports/my-tapestry.zip"
  style="width: 100%; height: 600px; border: 0"
></iframe>
```

The last opened Tapestry is cached in the browser's IndexedDB (database `tapestry`), scoped to the origin
the viewer is served from.
