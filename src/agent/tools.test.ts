import { describe, it, expect } from "vitest";
import {
  readCommits,
  readPullRequests,
  readCiStatus,
  readIssues,
  revertCommit,
  mergePullRequest,
  closeIssue,
  createComment,
  deleteRepo,
} from "./tools";

describe("Agent Tools", () => {
  it("readCommits executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await readCommits.execute({ owner: "test", repo: "test", limit: 2 });
    expect(result.tool).toBe("read_commits");
    expect(result.scope).toBe("read");
    expect(result.data.length).toBe(2);
  });

  it("readPullRequests executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await readPullRequests.execute({ owner: "test", repo: "test", state: "open" });
    expect(result.tool).toBe("read_pull_requests");
    expect(result.scope).toBe("read");
    expect(result.data).toBeDefined();
  });

  it("readCiStatus executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await readCiStatus.execute({ owner: "test", repo: "test" });
    expect(result.tool).toBe("read_ci_status");
    expect(result.scope).toBe("read");
  });

  it("readIssues executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await readIssues.execute({ owner: "test", repo: "test", state: "open" });
    expect(result.tool).toBe("read_issues");
    expect(result.scope).toBe("read");
  });

  it("revertCommit executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await revertCommit.execute({ owner: "test", repo: "test", commit_sha: "abc", reason: "test" });
    expect(result.tool).toBe("revert_commit");
    expect(result.scope).toBe("write");
  });

  it("mergePullRequest executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await mergePullRequest.execute({ owner: "test", repo: "test", pull_number: 1, merge_method: "merge" });
    expect(result.tool).toBe("merge_pull_request");
    expect(result.scope).toBe("write");
  });

  it("closeIssue executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await closeIssue.execute({ owner: "test", repo: "test", issue_number: 1, reason: "test" });
    expect(result.tool).toBe("close_issue");
    expect(result.scope).toBe("write");
  });

  it("createComment executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await createComment.execute({ owner: "test", repo: "test", issue_number: 1, body: "test comment" });
    expect(result.tool).toBe("create_comment");
    expect(result.scope).toBe("write");
    
    // Test long body truncation
    const longBody = "a".repeat(150);
    // @ts-expect-error ai tool execution
    const resultLong = await createComment.execute({ owner: "test", repo: "test", issue_number: 1, body: longBody });
    expect(resultLong.data.body.endsWith("...")).toBe(true);
  });

  it("deleteRepo executes correctly", async () => {
    // @ts-expect-error ai tool execution
    const result = await deleteRepo.execute({ owner: "test", repo: "test", confirm: true });
    expect(result.tool).toBe("delete_repo");
    expect(result.scope).toBe("write");
  });
});
