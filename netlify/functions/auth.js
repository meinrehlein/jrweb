const { createHandler } = require("netlify-cms-oauth-provider");

exports.handler = createHandler({
  provider: "github",
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});
