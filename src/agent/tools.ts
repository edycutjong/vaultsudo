/* ═══════════════════════════════════════════════════════════
   VaultSudo — Agent Tool Definitions
   Read tools (no friction) + Write tools (gated by VaultSudo)
   ═══════════════════════════════════════════════════════════ */

import { tool } from "ai";
import { z } from "zod";

/** GitHub API base parameters shared by all tools */
const repoParams = {
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
};

/* ────────────────────────────────────────────────────────
   READ TOOLS — No friction, always allowed
   ──────────────────────────────────────────────────────── */

export const readCommits = tool({
  description:
    "Read recent commits from a GitHub repository. Returns the latest commits with author, message, and SHA.",
  parameters: z.object({
    ...repoParams,
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Number of commits to return"),
  }),
  execute: async ({ limit }) => {
    // Mock GitHub API response for demo
    const mockCommits = [
      {
        sha: "abc1234",
        message: "fix: resolve CI pipeline failure in auth module",
        author: "alice-dev",
        date: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        sha: "def5678",
        message: "feat: add rate limiting to API endpoints",
        author: "bob-eng",
        date: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        sha: "ghi9012",
        message: "chore: update dependencies and security patches",
        author: "alice-dev",
        date: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        sha: "jkl3456",
        message: "refactor: optimize database query performance",
        author: "charlie-ops",
        date: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        sha: "mno7890",
        message:
          "BREAKING: remove deprecated auth endpoints (causes CI failure)",
        author: "bob-eng",
        date: new Date(Date.now() - 18000000).toISOString(),
      },
    ];

    return {
      tool: "read_commits",
      scope: "read",
      data: mockCommits.slice(0, limit),
      total: mockCommits.length,
    };
  },
});

export const readPullRequests = tool({
  description:
    "Read open pull requests from a GitHub repository. Returns PR title, author, status, and review state.",
  parameters: z.object({
    ...repoParams,
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .default("open")
      .describe("PR state filter"),
  }),
  execute: async () => {
    const mockPRs = [
      {
        number: 42,
        title: "fix: patch auth module for CORS handling",
        author: "alice-dev",
        state: "open",
        reviews: 1,
        ci_status: "passing",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        number: 41,
        title: "feat: add WebSocket support for real-time updates",
        author: "charlie-ops",
        state: "open",
        reviews: 0,
        ci_status: "failing",
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        number: 40,
        title: "chore: upgrade Node.js to v22",
        author: "bob-eng",
        state: "open",
        reviews: 2,
        ci_status: "passing",
        created_at: new Date(Date.now() - 259200000).toISOString(),
      },
    ];

    return {
      tool: "read_pull_requests",
      scope: "read",
      data: mockPRs,
      total: mockPRs.length,
    };
  },
});

export const readCiStatus = tool({
  description:
    "Read CI/CD pipeline status from a GitHub repository. Returns recent workflow runs with status and conclusion.",
  parameters: z.object({
    ...repoParams,
  }),
  execute: async () => {
    const mockRuns = [
      {
        id: 1001,
        name: "CI Pipeline",
        status: "completed",
        conclusion: "failure",
        branch: "main",
        commit_sha: "mno7890",
        created_at: new Date(Date.now() - 1800000).toISOString(),
        duration_seconds: 142,
      },
      {
        id: 1000,
        name: "CI Pipeline",
        status: "completed",
        conclusion: "success",
        branch: "main",
        commit_sha: "jkl3456",
        created_at: new Date(Date.now() - 14400000).toISOString(),
        duration_seconds: 98,
      },
      {
        id: 999,
        name: "Security Scan",
        status: "completed",
        conclusion: "success",
        branch: "main",
        commit_sha: "ghi9012",
        created_at: new Date(Date.now() - 28800000).toISOString(),
        duration_seconds: 67,
      },
    ];

    return {
      tool: "read_ci_status",
      scope: "read",
      data: mockRuns,
      latest_status: mockRuns[0].conclusion,
    };
  },
});

export const readIssues = tool({
  description:
    "Read issues from a GitHub repository. Returns issue title, labels, assignee, and status.",
  parameters: z.object({
    ...repoParams,
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .default("open")
      .describe("Issue state filter"),
  }),
  execute: async () => {
    const mockIssues = [
      {
        number: 15,
        title: "CI pipeline broken after auth endpoint removal",
        labels: ["bug", "critical", "ci"],
        assignee: "alice-dev",
        state: "open",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        number: 14,
        title: "Rate limiting not working on /api/users endpoint",
        labels: ["bug", "security"],
        assignee: "bob-eng",
        state: "open",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        number: 13,
        title: "Add monitoring dashboard for API metrics",
        labels: ["enhancement"],
        assignee: null,
        state: "open",
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    return {
      tool: "read_issues",
      scope: "read",
      data: mockIssues,
      total: mockIssues.length,
    };
  },
});

/* ────────────────────────────────────────────────────────
   WRITE TOOLS — Gated by VaultSudo middleware
   These tools have execute functions, but VaultSudo
   intercepts them before execution.
   ──────────────────────────────────────────────────────── */

export const revertCommit = tool({
  description:
    "Revert a specific commit in a GitHub repository. This is a WRITE action that requires human approval via VaultSudo.",
  parameters: z.object({
    ...repoParams,
    commit_sha: z.string().describe("The SHA of the commit to revert"),
    reason: z.string().describe("Reason for reverting this commit"),
  }),
  execute: async ({ commit_sha, reason }) => {
    // This will only execute if VaultSudo approves
    return {
      tool: "revert_commit",
      scope: "write",
      status: "executed",
      data: {
        reverted_sha: commit_sha,
        new_commit_sha: `rev_${Date.now().toString(36)}`,
        reason,
        message: `Successfully reverted commit ${commit_sha}`,
      },
    };
  },
});

export const mergePullRequest = tool({
  description:
    "Merge an open pull request. This is a WRITE action that requires human approval via VaultSudo.",
  parameters: z.object({
    ...repoParams,
    pull_number: z.number().describe("Pull request number to merge"),
    merge_method: z
      .enum(["merge", "squash", "rebase"])
      .optional()
      .default("merge"),
  }),
  execute: async ({ pull_number, merge_method }) => {
    return {
      tool: "merge_pull_request",
      scope: "write",
      status: "executed",
      data: {
        pull_number,
        merged: true,
        merge_method,
        merge_commit_sha: `mrg_${Date.now().toString(36)}`,
        message: `Successfully merged PR #${pull_number}`,
      },
    };
  },
});

export const closeIssue = tool({
  description:
    "Close an issue in a GitHub repository. This is a WRITE action that requires human approval via VaultSudo.",
  parameters: z.object({
    ...repoParams,
    issue_number: z.number().describe("Issue number to close"),
    reason: z.string().describe("Reason for closing this issue"),
  }),
  execute: async ({ issue_number, reason }) => {
    return {
      tool: "close_issue",
      scope: "write",
      status: "executed",
      data: {
        issue_number,
        state: "closed",
        reason,
        message: `Successfully closed issue #${issue_number}`,
      },
    };
  },
});

export const createComment = tool({
  description:
    "Create a comment on an issue or pull request. This is a WRITE action that requires human approval via VaultSudo.",
  parameters: z.object({
    ...repoParams,
    issue_number: z.number().describe("Issue or PR number to comment on"),
    body: z.string().describe("Comment text"),
  }),
  execute: async ({ issue_number, body }) => {
    return {
      tool: "create_comment",
      scope: "write",
      status: "executed",
      data: {
        issue_number,
        comment_id: Date.now(),
        body: body.slice(0, 100) + (body.length > 100 ? "..." : ""),
        message: `Successfully posted comment on #${issue_number}`,
      },
    };
  },
});

/**
 * dangerous tool: delete repo. always blocked unless explicitly approved
 */
export const deleteRepo = tool({
  description:
    "DELETE an entire GitHub repository. This is an EXTREMELY DANGEROUS action. VaultSudo will block this unless explicitly approved with matching scope.",
  parameters: z.object({
    ...repoParams,
    confirm: z
      .boolean()
      .describe("Must be true to confirm deletion intent"),
  }),
  execute: async ({ owner, repo }) => {
    return {
      tool: "delete_repo",
      scope: "write",
      status: "executed",
      data: {
        deleted: true,
        message: `Repository ${owner}/${repo} has been deleted`,
      },
    };
  },
});

/** All tools bundled for the AI agent */
export const agentTools = {
  read_commits: readCommits,
  read_pull_requests: readPullRequests,
  read_ci_status: readCiStatus,
  read_issues: readIssues,
  revert_commit: revertCommit,
  merge_pull_request: mergePullRequest,
  close_issue: closeIssue,
  create_comment: createComment,
  delete_repo: deleteRepo,
};
