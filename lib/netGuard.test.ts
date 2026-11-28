import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "./netGuard";

describe("isPrivateAddress", () => {
  it("blocks local and private networks", () => {
    for (const a of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::a00:1", "ff02::1"]) {
      expect(isPrivateAddress(a), a).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const a of ["8.8.8.8", "172.32.0.1", "151.101.1.1", "2a00:1450:4001::1", "::ffff:808:808"]) {
      expect(isPrivateAddress(a), a).toBe(false);
    }
  });
});
