import { context, getOctokit } from "@actions/github";
import { getPullRequest } from "./queries/getPullRequest";

(async function main() {
  console.log("Starting action");

  if (context.eventName !== "pull_request") {
    throw new Error("This action only works on pull requests");
  }

  const number = context.payload.pull_request?.number;
  if (!number) throw new Error("No pull request number found in context");

  const token = process.env?.GITHUB_TOKEN;
  if (!token) throw new Error("No GITHUB_TOKEN found in environment variables");

  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const octokit = getOctokit(token);

  const { body } = await getPullRequest({ octokit, owner, repo, number });

  const matchRequiredChecklist =
    /(?<=<!--- rfc-checklist -->\r\n)((?:.|\r|\n)*?)(?=<!--- rfc-checklist -->\r\n)/gi;

  const checklistMatches = body.match(matchRequiredChecklist);

  console.log(checklistMatches);

  checklistMatches?.forEach((list) => {
    const listItems = list.split("\n");
    const missingItems = listItems.filter((item) => item.startsWith("- [ ]"));
    if (missingItems.length) {
      console.log(`Please review and check the following items:`);
      console.log(missingItems.join("\n"));
    }
  });

  const matchRequiredRadio =
    /(?<=<!--- rfc-radio -->\r\n)((?:.|\r|\n)*?)(?=<!--- rfc-radio -->\r\n)/gi;

  const radioMatches = body.match(matchRequiredRadio);

  console.log(radioMatches);

  radioMatches?.forEach((list) => {
    const listItems = list.split("\n");
    const checkedItems = listItems.filter((item) => item.startsWith("- [x]"));
    if (checkedItems.length === 0) {
      console.log(`Please review and check one of the following items:`);
      console.log(listItems.join("\n"));
    }
  });
})();
