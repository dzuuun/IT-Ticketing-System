const express = require("express");
const fs = require("fs");
const path = require("path");

function serveFrontend(app, directory) {
  if (!fs.existsSync(directory)) return;

  app.use(express.static(directory, {
    setHeaders(res, filename) {
      // Every navigation must get the HTML for the current hashed bundles.
      if (path.basename(filename) === "index.html")
        res.setHeader("Cache-Control", "no-store");
    },
  }));
  app.use("/assets", (req, res) => {
    // A missing bundle must not silently become an HTML response.
    res.status(404).set("Cache-Control", "no-store").type("text/plain")
      .send("Asset not found. Reload the page to get the current application build.");
  });
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(directory, "index.html"), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}

module.exports = { serveFrontend };
