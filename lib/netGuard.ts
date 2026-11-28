import { isIP } from "net";

/** Addresses that must never be fetched from the server: local, private, link-local, multicast and reserved. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true;
    if (a.startsWith("fec") || a.startsWith("fed") || a.startsWith("fee") || a.startsWith("fef") || a.startsWith("ff")) return true;
    // IPv4 inside IPv6: ::ffff:1.2.3.4, ::ffff:0102:0304 (how URL writes it) and NAT64 64:ff9b::1.2.3.4
    const embedded = a.match(/^(?:::ffff:|64:ff9b::|::)(\d+\.\d+\.\d+\.\d+)$/);
    if (embedded) return isPrivateAddress(embedded[1]);
    const hex = a.match(/^(?:::ffff:|64:ff9b::|::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return false;
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}
