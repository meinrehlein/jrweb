// netlify/functions/github-oauth.js
import fetch from "node-fetch";

export async function handler(event, context) {
  const query = new URLSearchParams(event.queryStringParameters);
  const code = query.get("code"); // from GitHub OAuth
  const state = query.get("state"); // optional, for CSRF protection

  if (!code) {
    return {
      statusCode: 400,
      body: "Missing code parameter from GitHub OAuth",
    };
  }

  // GitHub OAuth App credentials
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return {
        statusCode: 400,
        body: "GitHub token exchange failed: " + JSON.stringify(tokenData),
      };
    }

    const token = tokenData.access_token;

    // Redirect to Decap CMS admin with token in query
    return {
      statusCode: 302,
      headers: {
        Location: `/admin/?t=${token}`,
      },
      body: "",
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: "Error during GitHub OAuth: " + err.message,
    };
  }
}
