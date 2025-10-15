import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";

/**
 * API route: /api/admin/verify
 * Runs verifyFirestoreData.js and returns its console output as JSON.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Path to your script
    const scriptPath = path.join(process.cwd(), "scripts", "verifyFirestoreData.js");
    let output = "";

    // Spawn the Node process to run the existing script
    const child = spawn("node", [scriptPath]);

    // Collect stdout
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    // Collect stderr (for errors)
    child.stderr.on("data", (data) => {
      output += data.toString();
    });

    // Wait for the script to finish
    child.on("close", async (code) => {
      const success = code === 0;
      const message = success
        ? "✅ Firestore verification complete"
        : "❌ Firestore verification encountered an error";

      let report = null;
      try {
        const logsDir = path.join(process.cwd(), "logs");
        const files = await fs.promises.readdir(logsDir);
        const reportFiles = files
          .filter((f) => f.startsWith("dataIntegrityReport"))
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(logsDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time);

        if (reportFiles.length > 0) {
          const latestReportPath = path.join(logsDir, reportFiles[0].name);
          const reportContent = await fs.promises.readFile(latestReportPath, "utf-8");
          report = JSON.parse(reportContent);
        }
      } catch (err) {
        console.warn("Warning: Failed to read or parse report file:", err);
      }

      res.status(success ? 200 : 500).json({
        success,
        message,
        output,
        report,
      });
    });
  } catch (err: any) {
    console.error("API /verify error:", err);
    res.status(500).json({
      success: false,
      message: "Internal error running Firestore verification",
      error: err.message,
    });
  }
}