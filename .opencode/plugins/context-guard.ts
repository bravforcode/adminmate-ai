import type { Plugin } from "@opencode-ai/plugin"
import * as path from "path"

/**
 * context-guard — prevents OpenCode from reading large output/lock files
 * that cause Autocompact thrashing in the adminmate-ai project.
 *
 * Files matching BLOCKED_PATTERNS will have their read intercepted and
 * replaced with a short summary, saving ~1 MB+ of context per session.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  /vitest-results\.json$/i,
  /vitest-final\.json$/i,
  /vitest-current\.json$/i,
  /e2e-results\.json$/i,
  /e2e-stderr\.txt$/i,
  /coverage_output\.txt$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /[\\/]node_modules[\\/]/,
  /[\\/]coverage[\\/]/,
  /[\\/]dist[\\/]/,
  /[\\/]playwright-report[\\/]/,
  /[\\/]test-results[\\/]/,
  /[\\/]backups[\\/]/,
  /[\\/]lancedb[\\/]/,
  /[\\/]\.playwright-mcp[\\/]/,
  /[\\/]audit_artifacts[\\/]/,
  /[\\/]Meta[\\/]states[\\/]/,
  /loadtests[\\/]results-.*\.json$/i,
  /\.(log)$/i,
]

function isBlocked(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/")
  return BLOCKED_PATTERNS.some((re) => re.test(normalized))
}

export const ContextGuardPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()

      // Intercept file read tools
      if (tool !== "read" && tool !== "read_file" && tool !== "file") return

      const args = output?.args as Record<string, unknown> | undefined
      if (!args) return

      const filePath =
        (args["path"] as string) ||
        (args["file_path"] as string) ||
        (args["filename"] as string) ||
        ""

      if (!filePath || !isBlocked(filePath)) return

      const basename = path.basename(filePath)
      // Override output to block the read
      ;(output as Record<string, unknown>).result =
        `[context-guard] Skipped reading "${basename}" — this file is excluded from context ` +
        `to prevent Autocompact thrashing. Use a targeted grep/jq command if you need specific data from it.`

      return output
    },
  }
}

export default ContextGuardPlugin
