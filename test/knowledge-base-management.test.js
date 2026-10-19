const test = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_ACCESS_SECRET = "kb-test-access-secret";
const db = require("../db");
let execute;
const originalQuery = db.query;
db.query = (...args) => execute(...args);
const routes = require("../api/knowledge-base/kb.routes");
db.query = originalQuery;
const { signAccessToken } = require("../auth/jwt");

let server;
let base;
let articles;
const data = { title: "A useful guide", category: "Hardware", summary: "Guide summary", content: "Follow these steps." };
test.before(async () => {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/kb", routes);
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${server.address().port}/api/kb`;
});
test.after(() => new Promise((resolve) => server.close(resolve)));
test.beforeEach(() => {
  articles = [
    { ...data, id: 1, title: "Published guide", slug: "published-guide", is_published: 1, author_id: 99, views: 20, helpful_count: 5 },
    { ...data, id: 2, title: "Private draft", slug: "private-draft", category: "Legacy", is_published: 0, author_id: 99, content: "Unpublished instructions", views: 4, helpful_count: 2 },
  ];
  execute = async (rawSql, params = []) => {
    const sql = rawSql.trim().replace(/\s+/g, " ");
    if (sql.includes("FROM users u WHERE u.id = ?")) {
      const roles = { 1: "admin", 2: "requestor", 3: "technician", 4: "team_leader", 5: "encoder" };
      return roles[params[0]] ? [{ id: params[0], role: roles[params[0]], is_active: 1 }] : [];
    }
    if (sql.startsWith("SELECT name FROM categories")) return params[0] === "Hardware" ? [{ name: "Hardware" }] : [];
    if (sql.startsWith("SELECT DISTINCT category")) return [...new Set(articles.filter((a) => !sql.includes("is_published = 1") || a.is_published).map((a) => a.category))].map((category) => ({ category }));
    if (sql.startsWith("SELECT id FROM knowledge_base WHERE slug")) return articles.filter((a) => a.slug === params[0]).map((a) => ({ id: a.id }));
    if (sql.startsWith("SELECT * FROM knowledge_base WHERE id")) return structuredClone(articles.filter((a) => a.id === params[0]));
    if (sql.startsWith("SELECT * FROM knowledge_base WHERE slug")) return structuredClone(articles.filter((a) => a.slug === params[0] && a.is_published));
    if (sql.startsWith("SELECT") && sql.includes("FROM knowledge_base")) {
      let values = articles.filter((a) => !sql.includes("is_published = 1") || a.is_published);
      if (sql.includes("is_published = 0")) values = values.filter((a) => !a.is_published);
      let index = 0;
      if (sql.includes("category = ?")) {
        const category = params[index++];
        values = values.filter((a) => a.category === category);
      }
      if (sql.includes("title LIKE ?")) {
        const term = params[index].slice(1, -1).toLowerCase();
        values = values.filter((a) => [a.title, a.summary, a.content].some((value) => value.toLowerCase().includes(term)));
      }
      if (!sql.startsWith("SELECT *")) values = values.map(({ content, is_published, ...a }) => a);
      return structuredClone(values);
    }
    if (sql.startsWith("INSERT INTO knowledge_base")) {
      const [title, slug, category, summary, content, author_id, is_published] = params;
      const id = articles.length + 1;
      articles.push({ id, title, slug, category, summary, content, author_id, is_published, views: 0, helpful_count: 0 });
      return { insertId: id };
    }
    const id = params.at(-1);
    const article = articles.find((a) => a.id === id);
    if (sql.startsWith("UPDATE knowledge_base SET title")) {
      const [title, category, summary, content, is_published] = params;
      Object.assign(article, { title, category, summary, content, is_published });
    } else if (sql.startsWith("UPDATE knowledge_base SET is_published")) article.is_published = params[0];
    else if (sql.startsWith("UPDATE knowledge_base SET views")) article.views++;
    else if (sql.startsWith("UPDATE knowledge_base SET helpful_count")) {
      if (!article?.is_published) return { affectedRows: 0 };
      article.helpful_count++;
    } else assert.fail(`Unexpected query: ${sql}`);
    return { affectedRows: 1 };
  };
});

function request(path = "", { userId, method = "GET", body } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Authorization: `Bearer ${signAccessToken({ id: userId, role: "admin" })}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test("public listing and article links never expose unpublished content", async () => {
  const listing = await request("?manage=true&status=unpublished");
  assert.equal(listing.status, 200);
  const result = await listing.json();
  assert.deepEqual(result.articles.map((a) => a.id), [1]);
  assert.deepEqual(result.categories, ["Hardware"]);
  assert.equal((await request("/private-draft")).status, 404);
  assert.equal((await request("/2/helpful", { method: "POST" })).status, 404);
});

test("management routes enforce the database role even when the JWT claims admin", async () => {
  for (const [path, method, body] of [
    ["/manage/articles", "GET"], ["", "POST", data],
    ["/1", "PATCH", data], ["/1/publication", "PATCH", { is_published: false }],
  ]) {
    assert.equal((await request(path, { method, body })).status, 401);
    for (const userId of [2, 3, 4, 5])
      assert.equal((await request(path, { userId, method, body })).status, 403);
  }
  assert.equal(articles.length, 2);
  assert.equal(articles[0].is_published, 1);
});

test("administrators can list and filter published and unpublished articles for editing", async () => {
  const listing = await request("/manage/articles", { userId: 1 });
  assert.equal(listing.status, 200);
  const result = await listing.json();
  assert.equal(result.articles.length, 2);
  assert.equal(result.articles[1].content, "Unpublished instructions");
  const filtered = await request("/manage/articles?status=unpublished&search=Private", { userId: 1 });
  assert.deepEqual((await filtered.json()).articles.map((a) => a.id), [2]);
  const category = await request("/manage/articles?category=Legacy", { userId: 1 });
  assert.deepEqual((await category.json()).articles.map((a) => a.id), [2]);
});

test("administrators can save unpublished articles without making them public", async () => {
  const result = await request("", { userId: 1, method: "POST", body: { ...data, is_published: false, author_id: 999 } });
  assert.equal(result.status, 201);
  const article = (await result.json()).article;
  assert.equal(article.is_published, false);
  assert.equal(articles[2].author_id, 1);
  assert.equal((await request(`/${article.slug}`)).status, 404);
});

test("editing preserves article links, authorship, and feedback counters", async () => {
  const result = await request("/1", { userId: 1, method: "PATCH", body: {
    ...data, title: "Renamed article", content: "Updated steps", slug: "replace-link", views: 0, author_id: 123,
  } });
  assert.equal(result.status, 200);
  assert.equal(articles[0].title, "Renamed article");
  assert.equal(articles[0].slug, "published-guide");
  assert.equal(articles[0].views, 20);
  assert.equal(articles[0].helpful_count, 5);
  assert.equal(articles[0].author_id, 99);
  assert.equal((await request("/published-guide")).status, 200);
});

test("unpublishing and republishing preserve content and change public visibility", async () => {
  assert.equal((await request("/1/publication", { userId: 1, method: "PATCH", body: { is_published: false } })).status, 200);
  assert.equal((await request("/published-guide")).status, 404);
  assert.equal(articles[0].content, data.content);
  assert.equal((await request("/1/publication", { userId: 1, method: "PATCH", body: { is_published: true } })).status, 200);
  assert.equal((await request("/published-guide")).status, 200);
  assert.equal(articles.length, 2);
});

test("editing old categories remains possible but new articles require an active catalog category", async () => {
  const body = { ...data, category: "Legacy" };
  assert.equal((await request("/2", { userId: 1, method: "PATCH", body })).status, 200);
  assert.equal(articles[1].is_published, 0);
  assert.equal((await request("", { userId: 1, method: "POST", body })).status, 400);
});

test("invalid article IDs, publication status, and missing fields return useful errors", async () => {
  assert.equal((await request("/missing", { userId: 1, method: "PATCH", body: data })).status, 400);
  assert.equal((await request("/999", { userId: 1, method: "PATCH", body: data })).status, 404);
  assert.equal((await request("/1/publication", { userId: 1, method: "PATCH", body: { is_published: "false" } })).status, 400);
  assert.equal((await request("", { userId: 1, method: "POST", body: { ...data, title: " " } })).status, 400);
  assert.equal((await request("", { userId: 1, method: "POST", body: { ...data, summary: "x".repeat(501) } })).status, 400);
  assert.equal(articles.length, 2);
});

test("duplicate titles get distinct article links", async () => {
  const one = await request("", { userId: 1, method: "POST", body: data });
  const two = await request("", { userId: 1, method: "POST", body: data });
  assert.equal(one.status, 201);
  assert.equal(two.status, 201);
  assert.notEqual((await one.json()).article.slug, (await two.json()).article.slug);
});
