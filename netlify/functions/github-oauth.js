// netlify/functions/github-oauth.js
import fetch from 'node-fetch';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;       // from your GitHub OAuth app
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export async function handler(event, context) {
  const { code } = event.queryStringParameters || {};

  // Step 1: Exchange code for access token
  if (code) {
    const tokenRes = await fetch(`https://github.com/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return {
        statusCode: 400,
        body: `OAuth error: ${tokenData.error_description || tokenData.error}`
      };
    }

    const access_token = tokenData.access_token;

    // Step 2: Redirect back to CMS admin with token
    return {
      statusCode: 302,
      headers: {
        Location: `/admin/?t=${access_token}`, // Decap CMS expects ?t=<token>
      },
      body: ''
    };
  }

  // Step 3: Start OAuth flow if no code
  const redirectUri = `${process.env.URL}/.netlify/functions/github-oauth/callback`;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect_uri=${redirectUri}`;

  return {
    statusCode: 302,
    headers: {
      Location: authUrl
    },
    body: ''
  };
}
