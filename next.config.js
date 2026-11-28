/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Versioned file name, so it can be cached for good.
        source: "/pdfjs/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        // Forms change rarely: reuse for an hour, then refresh in the background.
        source: "/pdfs/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }]
      }
    ];
  }
};

module.exports = nextConfig;
