require("dotenv").config();
const authorization = require("./authorization.js");
const statusChecks = require("./status_checks.js");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const fetch = require("node-fetch");
const express = require("express");
const app = express();
const client_id = process.env.GITHUB_CLIENT_ID;
const cookie_secret = process.env.COOKIE_SESSION_SECRET;

app.use(
  cookieSession({
    secret: cookie_secret,
  })
);

app.get("/", (req, res) => {
  res.send(
    "<h1>Welcome</h1><h3><a href='/login/github'>Sign in with GitHub</a></h3>"
  );
});

app.get("/login/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=http://localhost:3000/login/github/callback`;
  res.redirect(url);
});

app.get("/login/github/callback", async (req, res) => {
  const token = await authorization.getAccessToken(req);
  const githubData = await authorization.getGithubUser(token);

  res.send(
    "<h1>Hello " +
      githubData.name +
      "</h1><h3> <a href='/'>Home page</a> </br> <a href='/repos'>User repos</a></h3>"
  );
});

app.get("/repos", async (req, res) => {
  const githubData = await authorization.getGithubUser(
    req.session.access_token
  );
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

app.post("/webhook_commits", urlencodedParser, async (req, res) => {
  const payload = JSON.parse(req.body.payload);

  await statusChecks.createStatus(payload, "pending", "Processing checks...");

  console.log("Processing checks...");
  setTimeout(() => console.log("Checks was processed!"), 1000);

  await statusChecks.createStatus(payload, "success", "Checks was processed");

  res.send("Hello Dimka");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
