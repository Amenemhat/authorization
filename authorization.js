require("dotenv").config();
const fetch = require("node-fetch");
const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;

async function getGithubUser(access_token) {
  const req = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: "bearer " + access_token,
    },
  });
  const data = req.json();
  return data;
}

async function getAccessToken(req) {
  const token = await checkAccessToken(req);
  if (token != "" && token != null) {
    return token;
  }

  const code = req.query.code;
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      code,
    }),
  });
  const data = await res.text();
  const params = new URLSearchParams(data);

  let now = new Date() / 60;
  req.session.access_token = params.get("access_token");
  req.session.expires_in = +params.get("expires_in") + now;
  req.session.refresh_token = params.get("refresh_token");
  req.session.refresh_token_expires_in =
    +params.get("refresh_token_expires_in") + now;
  return params.get("access_token");
}

async function checkAccessToken(req) {
  let now = new Date() / 60;

  if (req.session.access_token) {
    if (req.session.expires_in > now) {
      return req.session.access_token;
    } else if (req.session.refresh_token_expires_in > now) {
      return await refreshToken(req);
    }
  }
  return "";
}

async function refreshToken(req) {
  const refresh_token = req.session.refresh_token;
  const grant_type = "refresh_token";
  const body = JSON.stringify({
    refresh_token,
    grant_type,
    client_id,
    client_secret,
  });
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  });
  const data = await res.text();
  const params = new URLSearchParams(data);

  let now = new Date() / 60;
  req.session.access_token = params.get("access_token");
  req.session.expires_in = +params.get("expires_in") + now;
  req.session.refresh_token = params.get("refresh_token");
  req.session.refresh_token_expires_in =
    +params.get("refresh_token_expires_in") + now;
  return params.get("access_token");
}

module.exports = { getGithubUser, getAccessToken };
