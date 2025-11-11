import { describe, expect, it } from "bun:test";

describe("basic suite", () => {
  it("confirms hello world", () => {
    expect("hello").toBe("hello");
  });
});
