import fetch from "node-fetch";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export async function handler(event) {
  const code = event.queryStringParameters.code;

  if (!code) {
    const redirectUri = `${event.headers["x-forwarded-proto"] || "https"}://${event.headers.host}/.netlify/functions/github-oauth`;
    return {
      statusCode: 302,
      headers: {
        Location: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}`,
      },
    };
  }

  // Exchange code for token
  const tokenRes = await fetch(`https://github.com/login/oauth/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return { statusCode: 500, body: JSON.stringify(tokenData) };
  }

  const host = `${event.headers["x-forwarded-proto"] || "https"}://${event.headers.host}`;

  // Redirect back to CMS with token
  return {
    statusCode: 302,
    headers: {
      Location: `${host}/admin/?t=${accessToken}`,
    },
  };
}
