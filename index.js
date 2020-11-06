require("dotenv").config();
const fetch = require("node-fetch");
const express = require("express");
const app = express();
const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;

app.get("/", (req, res) => {
  res.send("<h1>Welcome</h1><a href='/login/github'>Sign in with GitHub</a>");
});

app.get("/login/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=http://localhost:3000/login/github/callback`;
  res.redirect(url);
});

async function getAccessToken(code) {
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
  const code = req.query.code;
  const token = await getAccessToken(code);
  const githubData = await getGithubUser(token);

  res.send(
    "<h1>Hello " +
      githubData.name +
      "</h1><a href='/'>Home page</a><h2>access_token: " +
      token +
      "</h3><h2>User data: " +
      JSON.stringify(githubData) +
      "</h3>"
  );
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
