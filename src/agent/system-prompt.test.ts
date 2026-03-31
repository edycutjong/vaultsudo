import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "./system-prompt";

describe("systemPrompt", () => {
  it("should be a non-empty string definition", () => {
    expect(typeof SYSTEM_PROMPT).toBe("string");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    expect(SYSTEM_PROMPT).toContain("You are VaultSudo Agent");
  });
});
