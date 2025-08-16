// netlify/functions/github-oauth.js
import fetch from "node-fetch";

export async function handler(event) {
  const path = event.path.replace(/^\/+/, ""); // normalize path
  const query = event.queryStringParameters || {};

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = "https://meinrehlein.netlify.app/.netlify/functions/github-oauth";

  // Route for initiating login (/auth)
  if (path.endsWith("/auth")) {
    const site_id = encodeURIComponent(query.site_id || "https://meinrehlein.netlify.app");
    const scope = encodeURIComponent(query.scope || "repo");
    const state = encodeURIComponent(Math.random().toString(36).substring(2, 15)); // optional CSRF token

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&state=${state}`;

    return {
      statusCode: 302,
      headers: { Location: githubAuthUrl },
      body: "",
    };
  }

  // Callback route after GitHub login
  const code = query.code;
  if (!code) {
    return { statusCode: 400, body: "Missing code parameter from GitHub OAuth" };
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { statusCode: 400, body: "GitHub token exchange failed: " + JSON.stringify(tokenData) };
    }

    const token = tokenData.access_token;

    // Redirect to Decap CMS admin with token in query
    return {
      statusCode: 302,
      headers: { Location: `/admin/?t=${token}` },
      body: "",
    };
  } catch (err) {
    return { statusCode: 500, body: "Error during GitHub OAuth: " + err.message };
  }
}
