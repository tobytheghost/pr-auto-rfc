import { setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { getPullRequest } from "./queries/getPullRequest";

(async function main() {
  try {
    console.log("Starting action");

    if (context.eventName !== "pull_request") {
      throw new Error("This action only works on pull requests");
    }

    const number = context.payload.pull_request?.number;
    if (!number) throw new Error("No pull request number found in context");

    const token = process.env?.GITHUB_TOKEN;
    if (!token)
      throw new Error("No GITHUB_TOKEN found in environment variables");

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const octokit = getOctokit(token);

    const { body } = await getPullRequest({ octokit, owner, repo, number });

    const [_, ...forms] = body.split("<!--- r-form -->");

    if (!forms.length) return console.log("No forms found in PR body");

    const checkedForms = forms
      .map((form) => {
        const formFields = form.split("<!--- r-input-");
        return formFields.map((field) => {
          const type = /(.*) -->/.exec(field)?.[1];
          const title = /# (.*)/.exec(field)?.[1];
          if (!type || !title) throw new Error("Invalid form field ${field}");

          if (type === "checklist") {
            const missingChecklistItems = field
              .split("\n")
              .filter((item) => item.startsWith("- [ ]"));
            if (!missingChecklistItems.length) return;
            return `Please review and check the following items:\n${title}\n${missingChecklistItems.join(
              "\n"
            )}\n`;
          }

          if (type === "radio") {
            const missingRadioItems = field
              .split("\n")
              .filter((item) => item.startsWith("- [ ]"));
            if (!missingRadioItems.length) return;
            return `Please review and check at least one of the following items:\n${title}\n${missingRadioItems.join(
              "\n"
            )}\n`;
          }

          if (type === "text") {
            // Get value, remove title, remove comments & trim
            const value = field
              .split(`${title}`)[1]
              .replace(/<!--- (.*?) -->/gi, "")
              .trim();
            if (value.length) return;
            return `Please fill in the following field: "${title}"\n`;
          }

          return;
        });
      })
      .reduce((acc, curr) => [...acc, ...curr], [] as string[]);

    if (checkedForms.length) {
      throw new Error([...checkedForms].join("\n"));
    }
  } catch (error) {
    setFailed(error.message);
  }
})();
