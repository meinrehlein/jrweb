// netlify/functions/github-oauth.js
import fetch from "node-fetch";

export async function handler(event) {
  // Safely get query parameters
  const { code, state } = event.queryStringParameters || {};

  if (!code) {
    return {
      statusCode: 400,
      body: "Missing 'code' parameter from GitHub OAuth",
    };
  }

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      statusCode: 500,
      body: "GitHub client ID or secret is not set in environment variables",
    };
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

    // Redirect to Decap CMS admin with token
    return {
      statusCode: 302,
      headers: {
        Location: `https://meinrehlein.netlify.app/admin/?t=${token}`,
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
