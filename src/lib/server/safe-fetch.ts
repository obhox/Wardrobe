import "server-only";
import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

// Outbound fetch for user-supplied URLs (link previews, image proxy, price
// checks, image ingest). Guards against SSRF:
//   - http(s) only, default ports only
//   - every resolved address is checked, at connect time (no DNS rebinding
//     window between "check" and "connect")
//   - redirects are followed by hand and each hop is re-validated
//   - hard timeout and a streamed byte cap

export class BlockedUrlError extends Error {}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT (also some cloud internals)
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function inV4Block(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

export function isPrivateIp(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIPv4(ip)) return inV4Block(ip);
  if (net.isIPv6(ip)) {
    if (ip === "::" || ip === "::1") return true;
    // IPv4-mapped / compatible (::ffff:10.0.0.1)
    const mapped = ip.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return inV4Block(mapped[1]);
    if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(ip)) return true; // mapped, hex form
    const first = parseInt(ip.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (ip.startsWith("64:ff9b:")) return true; // NAT64 can reach v4 internals
    if (ip.startsWith("2001:db8:")) return true; // documentation
    return false;
  }
  return true; // not an IP at all — treat as unsafe
}

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("invalid url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new BlockedUrlError("unsupported protocol");
  if (url.username || url.password) throw new BlockedUrlError("credentials in url");
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new BlockedUrlError("non-standard port");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)))
    throw new BlockedUrlError("blocked host");
  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare) && isPrivateIp(bare)) throw new BlockedUrlError("blocked address");
  if (!net.isIP(bare) && !host.includes(".")) throw new BlockedUrlError("blocked host");
  return url;
}

// Resolve through DNS and refuse the connection if *any* answer is private.
const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      return callback(new BlockedUrlError(`blocked address for ${hostname}`), "", 4);
    }
    if ((options as dns.LookupOptions).all) {
      (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
};

const agent = new Agent({
  connect: { lookup: guardedLookup, timeout: 8_000 },
  headersTimeout: 12_000,
  bodyTimeout: 15_000,
});

export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 wardrobe/1.0";

export interface SafeResponse {
  status: number;
  ok: boolean;
  url: string; // final URL after redirects
  contentType: string;
  headers: Headers;
  body: Buffer;
  truncated: boolean;
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  accept?: string;
  maxRedirects?: number;
  // for HTML we'd rather parse a truncated page than fail
  allowTruncate?: boolean;
  userAgent?: string;
}

export async function safeFetch(raw: string, opts: SafeFetchOptions = {}): Promise<SafeResponse> {
  const {
    maxBytes = 8 * 1024 * 1024,
    timeoutMs = 12_000,
    accept = "*/*",
    maxRedirects = 5,
    allowTruncate = false,
    userAgent = BROWSER_UA,
  } = opts;

  const signal = AbortSignal.timeout(timeoutMs);
  let url = assertPublicUrl(raw);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await undiciFetch(url, {
      dispatcher: agent,
      redirect: "manual",
      signal,
      headers: {
        "user-agent": userAgent,
        accept,
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel().catch(() => {});
      url = assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes && !allowTruncate) {
      await res.body?.cancel().catch(() => {});
      throw new BlockedUrlError("response too large");
    }

    const chunks: Uint8Array[] = [];
    let size = 0;
    let truncated = false;
    if (res.body) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel().catch(() => {});
          if (!allowTruncate) throw new BlockedUrlError("response too large");
          truncated = true;
          chunks.push(value.subarray(0, value.byteLength - (size - maxBytes)));
          break;
        }
        chunks.push(value);
      }
    }

    return {
      status: res.status,
      ok: res.ok,
      url: url.toString(),
      contentType: (res.headers.get("content-type") ?? "").toLowerCase(),
      headers: res.headers as unknown as Headers,
      body: Buffer.concat(chunks),
      truncated,
    };
  }
  throw new BlockedUrlError("too many redirects");
}

export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await safeFetch(url, {
      accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      maxBytes: 2_000_000,
      allowTruncate: true,
    });
    if (!res.ok) return null;
    if (res.contentType && !/html|xml|text\/plain/.test(res.contentType)) return null;
    return { html: res.body.toString("utf8"), finalUrl: res.url };
  } catch {
    return null;
  }
}

// Raster formats only. SVG can carry script, so it's never proxied or stored.
export const RASTER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

// Sniff the real format from magic bytes — never trust a server's content-type.
export function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /avi[fs]/.test(buf.toString("ascii", 8, 12)))
    return "image/avif";
  return null;
}
