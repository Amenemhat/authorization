const { Octokit } = require("@octokit/rest");
const octokitToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const octokit = new Octokit({
  auth: octokitToken,
});

async function createStatus(body, state, description) {
  const owner = body.repository.owner.name;
  const repo = body.repository.name;
  const sha = body.commits[0].id;

  const data = await octokit.repos.createCommitStatus({
    owner: owner,
    repo: repo,
    sha: sha,
    state: state,
    target_url: "",
    description: description,
  });
  return data;
}

module.exports = { createStatus };
