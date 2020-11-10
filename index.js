require("dotenv").config();
const fetch = require("node-fetch");
const cookieSession = require("cookie-session");
const express = require("express");
const app = express();
const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;
const cookie_secret = process.env.COOKIE_SECRET;

app.get("/", (req, res) => {
  res.send("<h1>Welcome</h1><a href='/login/github'>Sign in with GitHub</a>");
});

app.get("/login/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=http://localhost:3000/login/github/callback`;
  res.redirect(url);
});

app.use(
  cookieSession({
    secret: cookie_secret,
  })
);

async function refreshToken(req) {
  const refresh_token = req.session.refresh_token;
  const grant_type = "refresh_token";
  const body = JSON.stringify({
    refresh_token,
    grant_type,
    client_id,
    client_secret,
  });
  console.log(body);
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  });
  const data = await res.text();
  const params = new URLSearchParams(data);
  console.log("refreshToken");
  console.log(params);

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
  console.log(
    "refresh_token_expires_in = " +
      req.session.refresh_token_expires_in +
      " > now =" +
      now +
      " token = " +
      req.session.access_token
  );

  if (req.session.access_token) {
    //if (false) {
    if (req.session.expires_in > now) {
      console.log(
        "checkAccessToken return req.session.access_token = " +
          req.session.access_token
      );
      return req.session.access_token;
    } else if (req.session.refresh_token_expires_in > now) {
      console.log("checkAccessToken return await refreshToken(req)");
      return await refreshToken(req);
    }
  }
  console.log("checkAccessToken return null");
  return "";
}

async function getAccessToken(req) {
  const token = await checkAccessToken(req);
  if (token != "" && token != null) {
    console.log("getAccessToken return token = " + JSON.stringify(token));
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
  console.log("getAccessToken");
  console.log(params);

  let now = new Date() / 60;
  req.session.access_token = params.get("access_token");
  req.session.expires_in = +params.get("expires_in") + now;
  req.session.refresh_token = params.get("refresh_token");
  req.session.refresh_token_expires_in =
    +params.get("refresh_token_expires_in") + now;
  return params.get("access_token");
}

async function getGithubUser(access_token) {
  const req = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: "bearer " + access_token,
    },
  });
  const data = req.json();
  return data;
}

app.get("/login/github/callback", async (req, res) => {
  const token = await getAccessToken(req);
  const githubData = await getGithubUser(token);

  res.send(
    "<h1>Hello " +
      githubData.name +
      "</h1><a href='/'>Home page</a><h2>access_token: " +
      token +
      "</h3><p>User data: " +
      JSON.stringify(githubData) +
      "</p>"
  );
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
