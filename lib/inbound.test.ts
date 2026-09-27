import { describe, expect, it } from "vitest";
import { interpretInbound, twimlMessage } from "./inbound";

describe("interpretInbound", () => {
  it("treats a trimmed reply of 1 as review", () => {
    expect(interpretInbound("1")).toBe("review");
    expect(interpretInbound(" 1 ")).toBe("review");
    expect(interpretInbound("2")).toBe("ignore");
    expect(interpretInbound("yes")).toBe("ignore");
  });

  it("escapes TwiML text", () => {
    expect(twimlMessage("Heads Up: <ok>")).toContain("Heads Up: &lt;ok&gt;");
  });
});