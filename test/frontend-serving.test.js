const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { serveFrontend } = require("../api/middleware/frontend");

let directory;
let server;
let origin;
test.before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "ndmu-frontend-test-"));
  fs.mkdirSync(path.join(directory, "assets"));
  fs.writeFileSync(path.join(directory, "index.html"), '<!doctype html><html><body><div id="root"></div><script src="/assets/current.js"></script></body></html>');
  fs.writeFileSync(path.join(directory, "assets/current.js"), 'console.log("current build");');
  fs.writeFileSync(path.join(directory, "assets/current.css"), 'body { color: green; }');
  const app = express();
  const router = express.Router();
  router.get("/api/status", (req, res) => res.json({ success: true }));
  serveFrontend(router, directory);
  app.use("/it-ticketing-system", router);
  app.use(router);
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const filename of ["index.html", "assets/current.js", "assets/current.css"])
    fs.unlinkSync(path.join(directory, filename));
  fs.rmdirSync(path.join(directory, "assets"));
  fs.rmdirSync(directory);
});

test("HTML entry points and browser routes bypass caching at root and shared-site paths", async () => {
  for (const prefix of ["", "/it-ticketing-system"]) {
    for (const route of ["/", "/index.html", "/submit", "/admin/knowledge-base"]) {
      const response = await fetch(`${origin}${prefix}${route}`);
      assert.equal(response.status, 200, `${prefix}${route}: ${response.status === 200 ? "" : await response.text()}`);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(await response.text(), /id="root"/);
    }
  }
});

test("current JavaScript and CSS bundles are served with their actual content types", async () => {
  for (const prefix of ["", "/it-ticketing-system"]) {
    const script = await fetch(`${origin}${prefix}/assets/current.js`);
    assert.equal(script.status, 200, `${prefix}/assets/current.js: ${script.status === 200 ? "" : await script.text()}`);
    assert.match(script.headers.get("content-type"), /javascript/);
    assert.match(await script.text(), /current build/);
    const css = await fetch(`${origin}${prefix}/assets/current.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /text\/css/);
  }
});

test("missing old bundles return an uncached 404 instead of application HTML", async () => {
  const response = await fetch(`${origin}/it-ticketing-system/assets/old-build.js`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type"), /text\/plain/);
  assert.doesNotMatch(await response.text(), /<!doctype html>/);
});

test("frontend fallback does not override existing API routes", async () => {
  const response = await fetch(`${origin}/it-ticketing-system/api/status`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
});
