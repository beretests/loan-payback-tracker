import { describe, expect, it } from "vitest";
import { monthBounds } from "./monthRange";

describe("monthBounds", () => {
  it("returns an exclusive boundary for a regular month", () => {
    expect(monthBounds("2026-09")).toEqual({
      start: "2026-09-01",
      end: "2026-10-01",
    });
  });

  it("handles a year boundary", () => {
    expect(monthBounds("2026-12")).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });

  it.each(["", "not-a-month", "2026-13"])(
    "rejects invalid month %s",
    (month) => {
      expect(monthBounds(month)).toEqual({ start: null, end: null });
    },
  );
});
