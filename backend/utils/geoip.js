import axios from "axios";

// Free, no-auth geo IP. See: http://ip-api.com/docs/api:json
// Usage limit: 45 requests/minute from a given IP (sufficient for dev / low-traffic).
export const lookupIpLocation = async (ip) => {
  try {
    if (!ip) return null;

    // Remove IPv6 prefix if present (e.g. "::ffff:127.0.0.1")
    const cleanIp = ip.replace(/^::ffff:/, "");

    // Don't call geo IP for local addresses
    if (
      cleanIp === "127.0.0.1" ||
      cleanIp === "::1" ||
      cleanIp.startsWith("192.168.") ||
      cleanIp.startsWith("10.") ||
      cleanIp.startsWith("172.16.")
    ) {
      return null;
    }

    const url = `http://ip-api.com/json/${cleanIp}?fields=status,message,country,city,query`;
    const res = await axios.get(url, { timeout: 3000 });

    if (res.data?.status !== "success") {
      return null;
    }

    return {
      city: res.data.city || undefined,
      country: res.data.country || undefined,
      ip: res.data.query || cleanIp,
    };
  } catch (err) {
    // Swallow errors; just return null
    return null;
  }
};