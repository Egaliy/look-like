import { NextResponse } from "next/server";
import os from "os";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const uptimeSec = os.uptime();

    let disk: { total?: string; used?: string; free?: string; percent?: string } = {};
    try {
      const df = execSync('df -h .', { encoding: "utf8" });
      const lines = df.trim().split("\n");
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 5) {
          disk = {
            total: parts[1],
            used: parts[2],
            free: parts[3],
            percent: parts[4],
          };
        }
      }
    } catch {
      // disk info not available
    }

    const processMem = process.memoryUsage();

    return NextResponse.json({
      memory: {
        totalMb: Math.round(totalMem / 1024 / 1024),
        freeMb: Math.round(freeMem / 1024 / 1024),
        usedMb: Math.round(usedMem / 1024 / 1024),
        usedPercent: Math.round((usedMem / totalMem) * 100),
      },
      processMemory: {
        rssMb: Math.round(processMem.rss / 1024 / 1024),
        heapUsedMb: Math.round(processMem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(processMem.heapTotal / 1024 / 1024),
      },
      load: loadAvg.map((l) => Math.round(l * 100) / 100),
      uptimeSeconds: Math.floor(uptimeSec),
      disk,
    });
  } catch (error) {
    console.error("Server info error:", error);
    return NextResponse.json(
      { error: "Failed to get server info" },
      { status: 500 }
    );
  }
}
