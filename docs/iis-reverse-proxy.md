# IIS reverse-proxy deployment

The Service Desk can be served from a dedicated IIS binding such as:

```text
http://SERVER-IP:8080/
```

or beside the existing Dispenser and TapTrack routes at:

```text
http://SERVER-IP/it-ticketing-system/
```

IIS owns the public IP and port. The Node.js application stays private at
`127.0.0.1:5000`; do not create a firewall rule exposing port 5000.

## 1. Prepare the application

Build the client, then run the service as the process manager account used by
the server (for example, PM2):

```powershell
Set-Location -LiteralPath "C:\path\to\IT-Ticketing-System"
npm run client:build
pm2 start index.js --name ndmu-it-ticketing
Invoke-WebRequest http://127.0.0.1:5000/health
```

Set these values in the server's private `.env` file:

```dotenv
NODE_ENV=production
PORT=5000
CLIENT_URL=http://SERVER-IP:8080
GOOGLE_CALLBACK_URL=http://SERVER-IP:8080/auth/google/callback

# Use only while the IIS binding is plain HTTP on a trusted internal network.
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

The application always resolves `.env` from its own installation directory,
not PM2's current working directory. Keep the file beside `index.js` and make
sure the account running PM2 can read it. Host-level `DB_*` environment
variables intentionally take precedence over the file; remove or update any
stale PM2/IIS `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, or `DB_NAME`
values before restarting if the file should supply the database connection.

For an HTTPS IIS binding, use `https://SERVER-IP:PORT` for `CLIENT_URL` and
`GOOGLE_CALLBACK_URL`, remove `COOKIE_SECURE=false`, and leave the cookie
settings at their production defaults. Update the Google OAuth authorized
redirect URI to exactly match `GOOGLE_CALLBACK_URL` when Google sign-in is
enabled.

### Shared IIS site configuration

For the same IIS site shown in the Dispenser and TapTrack setup, use this
configuration instead:

```dotenv
CLIENT_URL=http://SERVER-IP/it-ticketing-system
GOOGLE_CALLBACK_URL=http://SERVER-IP/it-ticketing-system/auth/google/callback
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

Rebuild the client after setting `VITE_PUBLIC_BASE_PATH`:

```powershell
$env:VITE_PUBLIC_BASE_PATH = "/it-ticketing-system/"
npm run client:build
pm2 restart ndmu-it-ticketing
```

Copy the two rules from
[shared-site-rules.xml](../deployment/iis/shared-site-rules.xml) into the
shared IIS site's `configuration/system.webServer/rewrite/rules` element. Put
them after the TapTrack rules shown in the screenshot (or before any broad
catch-all rule). This publishes the application at
`http://SERVER-IP/it-ticketing-system/` and preserves its own API, auth,
uploads, and browser routes.

## 2. Configure IIS

1. Install **IIS URL Rewrite Module 2** and **Application Request Routing
   (ARR) 3**.
2. In IIS Manager, select the server, open **Application Request Routing
   Cache**, select **Server Proxy Settings**, enable **Proxy**, and apply.
3. Create a dedicated IIS site, for example `NDMU Service Desk`, with a binding
   for the server IP and the chosen public port, such as `8080`.
4. Use an empty physical folder for that IIS site and copy
   [web.config](../deployment/iis/web.config) into it. Do not use the
   application repository itself as the IIS physical path.
5. Allow the chosen IIS port through Windows Firewall if clients outside the
   server need access.

The rule forwards the application, API, authentication, uploads, and React
client routes unchanged to Node. It therefore works at the root of the public
binding without changing frontend URLs.

## 3. Verify

After restarting the Node process and IIS site, verify:

```text
http://SERVER-IP:8080/health
http://SERVER-IP:8080/
http://SERVER-IP:8080/setup
```

Sign in, submit a small test ticket, and download an attachment to confirm
both authentication cookies and protected uploads pass through IIS. For
production use, add an HTTPS IIS binding and use its HTTPS URL instead.

## Rebuilds and missing assets

Build from the directory used by PM2. For the shared site, set
`VITE_PUBLIC_BASE_PATH=/it-ticketing-system/` before building. The generated
`client/dist/index.html` and the entire `client/dist/assets` directory must
come from the same build; do not copy only the HTML or selected bundle files.

After a successful build, restart the application and use Ctrl+F5 in the
browser. Application HTML is served with `Cache-Control: no-store` so future
navigations reference the current bundles. A page already open during a build
may still need refreshing. If assets still return 404, compare the full failing
URL against the script and stylesheet URLs in `client/dist/index.html`, and
verify the shared-site IIS rule forwards `/it-ticketing-system/assets/...` to
this application's Node process.

For an HTTP LAN URL, set `CLIENT_URL` to that exact HTTP application URL.
HTTPS-only headers are disabled for this mode. Google sign-in on a LAN IP
requires an appropriate HTTPS domain; Google permits HTTP only for localhost
development.
