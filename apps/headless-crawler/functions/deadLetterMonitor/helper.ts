import { Octokit } from "octokit";

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is not set");
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

function generateBugIssueBody({ errorLog }: { errorLog: string }) {
  return `
### エラーのログ
\`\`\`
${errorLog}
\`\`\`
`;
}

export async function createBugIssue({
  title,
  errorLog,
}: {
  title: string;
  errorLog: string;
}) {
  const body = generateBugIssueBody({ errorLog });
  const response = await octokit.rest.issues.create({
    owner: "shidari",
    repo: "hello-work-software-jobs",
    title,
    body,
  });
  console.log("イシュー作成成功:", response.data.html_url);
}
