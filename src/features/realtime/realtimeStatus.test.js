import { describe, expect, it } from "vitest";
import { connectionLabel } from "./realtimeStatus";

describe("connectionLabel", () => {
  it("reports live only after the channel subscribes", () => {
    expect(connectionLabel("SUBSCRIBED", true)).toBe("Live");
  });

  it("reports reconnecting for channel errors and timeouts", () => {
    expect(connectionLabel("CHANNEL_ERROR", true)).toBe("Reconnecting");
    expect(connectionLabel("TIMED_OUT", true)).toBe("Reconnecting");
  });

  it("prioritizes browser offline state", () => {
    expect(connectionLabel("SUBSCRIBED", false)).toBe("Offline");
  });
});
