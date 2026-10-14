const path = require("path");
const dotenv = require("dotenv");

// A process manager can launch Node with a working directory other than the
// application directory. Do not let that change which .env file is loaded.
const applicationRoot = path.resolve(__dirname, "..");
const environmentFile = path.join(applicationRoot, ".env");

// Deliberately keep explicitly supplied process environment variables ahead of
// file values. This supports secret stores and platform-provided configuration,
// while still reliably loading the application's own .env file when no value
// was supplied by the host.
dotenv.config({ path: environmentFile });

module.exports = {
  applicationRoot,
  environmentFile,
};
