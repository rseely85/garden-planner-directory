import type { NextApiRequest, NextApiResponse } from "next";

/**
 * POST /api/revalidate
 * Body or query: { secret: string, path: string }
 * Or header: x-revalidate-secret: <secret>
 *
 * Requires REVALIDATE_SECRET to be set in env. This endpoint calls Next.js on-demand
 * revalidation for the provided path.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const secret = (req.headers["x-revalidate-secret"] as string) || req.body?.secret || req.query?.secret;
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected) {
    console.error("REVALIDATE_SECRET is not set in environment");
    return res.status(500).json({ success: false, message: "Revalidation secret not configured on server." });
  }

  if (!secret || secret !== expected) {
    return res.status(401).json({ success: false, message: "Invalid or missing revalidation secret." });
  }

  const path = req.body?.path || req.query?.path;
  if (!path || typeof path !== "string") {
    return res.status(400).json({ success: false, message: "Missing or invalid 'path' to revalidate." });
  }

  try {
    // Next.js exposes res.revalidate in pages API routes; types may not include it, so cast to any.
    // This will trigger ISR re-generation for the provided path.
    // Example path: `/supplier/some-slug`
    // If you're calling this from admin scripts, add the REVALIDATE_SECRET to the request.
    // NOTE: On Vercel, you may prefer to call Vercel's revalidation API instead.
  await (res as any).revalidate(path);
    return res.status(200).json({ success: true, revalidated: path });
  } catch (err: any) {
    console.error("Failed to revalidate", path, err);
    return res.status(500).json({ success: false, message: "Failed to revalidate", error: err?.message });
  }
}
