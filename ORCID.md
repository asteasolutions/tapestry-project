# ORCID Login

Tapestries can authenticate users with [ORCID](https://orcid.org) as an alternative to
Internet Archive or Google. It uses ORCID's OAuth 2.0
["Get an authenticated ORCID iD"](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/)
flow.

## How the flow works

1. The client shows a **Sign in with ORCID** button. Clicking it redirects the whole
   window to ORCID's `/oauth/authorize` endpoint (`client/src/auth/orcid/service.ts`).
2. The user authorizes on ORCID, which redirects back to the configured **redirect URI**
   with a `?code=...` authorization code.
3. On load, the client reads that `code` from the URL and posts it to the Tapestries
   server, which exchanges it with ORCID's `/oauth/token` endpoint for the authenticated
   ORCID iD (`server/src/auth/providers/orcid.ts`).
4. A Tapestries session is created and the OAuth params are stripped from the URL.

The `/authenticate` scope only returns the user's ORCID iD and (optionally) name — **no
email**. Tapestries therefore synthesizes a stable placeholder email (`<orcid-id>@orcid.org`)
to satisfy the `User` model, and stores the ORCID iD in the new `User.orcidId` column
(migration `20260619140000_add_orcid_id_to_user`).

## Registering an ORCID application

1. Go to [orcid.org/developer-tools](https://orcid.org/developer-tools) for production, or
   [sandbox.orcid.org/developer-tools](https://sandbox.orcid.org/developer-tools) for testing.
   **Credentials are not interchangeable** — a sandbox client ID only works against
   `https://sandbox.orcid.org`, and a production one only against `https://orcid.org`.
2. Add a **Redirect URI**. It must match what the app sends, byte-for-byte, including the
   trailing slash (see the gotcha below).
3. Note the generated **Client ID** (looks like `APP-XXXXXXXXXXXXXXXX`) and **Client secret**.

> **Gotcha — `localhost` is rejected.** ORCID will not accept `http://localhost:8080/` as a
> redirect URI, but it *does* accept `http://127.0.0.1:8080/`. If you register the `127.0.0.1`
> form, you must also load the app at `http://127.0.0.1:8080` (not `localhost`) so the URI the
> client sends matches the one you registered.

## Configuration

Set these in `.env` (Docker Compose reads it automatically) or in your deployment
environment.

| Variable | Side | Purpose |
| --- | --- | --- |
| `AUTH_PROVIDER=orcid` | both | Selects ORCID. Mapped to the client as `VITE_AUTH_PROVIDER`. |
| `ORCID_CLIENT_ID` | server + client | OAuth client ID. Mapped to the client as `VITE_ORCID_CLIENT_ID`. |
| `ORCID_CLIENT_SECRET` | server | OAuth client secret. **Server only** — never sent to the client. |
| `ORCID_BASE_URL` | server + client | `https://orcid.org` (default) or `https://sandbox.orcid.org`. Mapped as `VITE_ORCID_BASE_URL`. |
| `ORCID_REDIRECT_URI` | server + client | Optional. Blank = the client app's own origin + `/`. Set it to pin the value (e.g. `http://127.0.0.1:8080/`). Mapped as `VITE_ORCID_REDIRECT_URI`. |

Example sandbox block:

```dotenv
AUTH_PROVIDER=orcid
ORCID_CLIENT_ID=APP-XXXXXXXXXXXXXXXX
ORCID_CLIENT_SECRET=00000000-0000-0000-0000-000000000000
ORCID_BASE_URL=https://sandbox.orcid.org
ORCID_REDIRECT_URI=http://127.0.0.1:8080/
```

> **Gotcha — the client ID is baked in at build time.** `VITE_ORCID_CLIENT_ID`,
> `VITE_ORCID_BASE_URL`, and `VITE_ORCID_REDIRECT_URI` are **Docker build args**, compiled
> into the client bundle. Changing them in `.env` and merely restarting the containers will
> *not* take effect — you must **rebuild the client image**. (The server, by contrast, reads
> its ORCID variables at runtime.)

## Running it

After setting the variables, rebuild and recreate the client and server:

```bash
docker compose -f docker-compose.local.yml up -d --build client server
```

The `orcidId` migration is applied automatically on server startup (`start:api` runs
`prisma migrate deploy`).

Then open the app at the host matching your redirect URI (e.g. `http://127.0.0.1:8080`) and
click **Sign in with ORCID**. Hard-refresh (Cmd/Ctrl-Shift-R) if the browser has an old bundle
cached.

## Troubleshooting

- **`invalid_request: Invalid parameter: client_id` on ORCID's page, with a placeholder/old
  client ID in the authorize URL** — the client bundle still has the old value baked in.
  Rebuild the client image (see the build-arg gotcha) and hard-refresh. You can confirm which
  ID is baked in:
  ```bash
  curl -s http://127.0.0.1:8080/ | grep -oE 'assets/[^"]+\.js' | head -1 \
    | xargs -I{} curl -s http://127.0.0.1:8080/{} | grep -oE 'APP-[A-Z0-9]+' | sort -u
  ```
- **Redirect-mismatch error on ORCID before returning to the app** — the redirect URI the
  client sent isn't registered verbatim. Check the trailing slash and `127.0.0.1` vs
  `localhost`.
- **`Error while performing ORCID authentication` in the server logs** — the code-for-token
  exchange failed (`server/src/auth/providers/orcid.ts`). Most often a wrong
  `ORCID_CLIENT_SECRET`, a `ORCID_BASE_URL` that doesn't match where the credentials were
  registered, or a `redirect_uri` that differs between the authorize and token steps. Tail
  with:
  ```bash
  docker compose -f docker-compose.local.yml logs -f server
  ```
- **Session/cookie not sticking when the client is on `127.0.0.1` and the API on `localhost`**
  — these are cross-site. The session cookie is already set `SameSite=None` to allow this, and
  `http://localhost` counts as a secure context. If a browser still drops it, put everything on
  one host by also setting `VITE_API_URL=http://127.0.0.1:3000/api`.
