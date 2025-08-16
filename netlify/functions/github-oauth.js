import fetch from 'node-fetch';

export async function handler(event) {
  const params = new URLSearchParams(event.queryStringParameters);
  const code = params.get('code');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  return {
    statusCode: 200,
    body: JSON.stringify(tokenData),
  };
}
