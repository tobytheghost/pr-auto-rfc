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

    const [_, ...forms] = body.split("<!--- rfc-form -->");

    if (!forms.length) return;

    const checkedForms = forms.map((form) => {
      const formFields = form.split("<!--- rfc-end -->");
      const checkedFields = formFields.map((field) => {
        const title = /## (.*)/.exec(field)?.[1];
        const type = /<!--- rfc-input-(.*) -->/.exec(field)?.[1];

        if (type === "checklist") {
          const missingChecklistItems = field
            .split("\n")
            .filter((item) => item.startsWith("- [ ]"));
          if (!missingChecklistItems.length) return;
          return `Please review and check the following items\n${title}\n${missingChecklistItems.join(
            "\n"
          )}\n`;
        }

        if (type === "radio") {
          const missingRadioItems = field
            .split("\n")
            .filter((item) => item.startsWith("- [ ]"));
          if (!missingRadioItems.length) return;
          return `Please review and check at least one of the following items\n${title}\n${missingRadioItems.join(
            "\n"
          )}\n`;
        }

        return;
      }).reduce((acc, curr) => [...acc, ...curr], [] as string[]);

      return checkedFields;
    }).reduce((acc, curr) => [...acc, ...curr], [] as string[]);

    if (checkedForms.length) {
      throw new Error([...checkedForms].join("\n\n"));
    }
  } catch (error) {
    setFailed(error.message);
  }
})();
