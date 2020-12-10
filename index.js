require("dotenv").config();
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");
const cookieSession = require("cookie-session");
const express = require("express");
const app = express();
const client_id = process.env.GITHUB_CLIENT_ID;
const client_secret = process.env.GITHUB_CLIENT_SECRET;
const cookie_secret = process.env.COOKIE_SESSION_SECRET;
const octokitToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const octokit = new Octokit({
  auth: octokitToken,
});

app.get("/", (req, res) => {
  res.send(
    "<h1>Welcome</h1><h3><a href='/login/github'>Sign in with GitHub</a></h3>"
  );
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
      "</h1><h3> <a href='/'>Home page</a> </br> <a href='/repos'>User repos</a></h3>"
  );
});

app.get("/repos", async (req, res) => {
  const githubData = await getGithubUser(req.session.access_token);
  const urlRepos = githubData.repos_url;
  const response = await fetch(urlRepos);
  const data = await response.text();
  const params = JSON.parse(data).map(
    (item) =>
      "<a href='https://github.com/" +
      item.full_name +
      "'>" +
      item.full_name +
      "</a>"
  );

  res.send(
    "<h1>Hello " +
      githubData.name +
      "</h1><h3><a href='/'>Home page</a></br>Your repos: <ul><li>" +
      params.join("</li><li>") +
      "</li></ul></h3>"
  );
});

async function createStatus(body){
  const owner = body.repository.owner.name;
  const repo = body.repository.name;
  const sha = body.commits[0].id;

  console.log("owner: " + owner + " repo: " + repo + " sha: " + sha);

  const data = await octokit.repos.createCommitStatus({
    owner: owner,
    repo: repo,
    sha: sha,
    state: "success",
    target_url: "",
    description: "Hello Dimka!",
  });
  return data;
}

app.post("/webhook", urlencodedParser, async (req, res) => {

  const data = await createStatus(JSON.parse(req.body.payload));
  console.log(data);

  res.send("Hello Dimka");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
