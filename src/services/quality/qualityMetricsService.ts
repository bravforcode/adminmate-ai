import { supabase } from '../../lib/supabase'

export interface QualitySnapshot {
  id: string
  company_id: string
  commit_sha: string | null
  branch: string | null
  tests_passed: number
  tests_failed: number
  tests_skipped: number
  coverage_lines: number
  coverage_functions: number
  coverage_branches: number
  build_time_ms: number
  bundle_size_bytes: number
  recorded_at: string
}

export interface QualityBaseline {
  id: string
  company_id: string
  metric_name: string
  metric_value: number
  set_by: string
  created_at: string
  updated_at: string
}

export interface RegressionCheck {
  metric: string
  baseline: number
  current: number
  delta: number
  deltaPercent: number
  regressed: boolean
}

export interface QualityReport {
  companyId: string
  snapshot: QualitySnapshot | null
  baselines: QualityBaseline[]
  regressions: RegressionCheck[]
  passed: boolean
  generatedAt: string
}

const REGRESSION_THRESHOLDS: Record<string, number> = {
  coverage_lines: -2,
  coverage_functions: -2,
  coverage_branches: -2,
  tests_passed: -5,
  tests_failed: 10,
  build_time_ms: 20,
  bundle_size_bytes: 5,
}

function deltaPercent(current: number, baseline: number): number {
  if (baseline === 0) return current > 0 ? 100 : 0
  return ((current - baseline) / baseline) * 100
}

export const qualityMetricsService = {
  async recordSnapshot(
    companyId: string,
    data: {
      commitSha?: string
      branch?: string
      testsPassed: number
      testsFailed: number
      testsSkipped: number
      coverageLines: number
      coverageFunctions: number
      coverageBranches: number
      buildTimeMs: number
      bundleSizeBytes: number
    }
  ): Promise<QualitySnapshot> {
    const { data: result, error } = await supabase
      .from('quality_snapshots')
      .insert({
        company_id: companyId,
        commit_sha: data.commitSha ?? null,
        branch: data.branch ?? null,
        tests_passed: data.testsPassed,
        tests_failed: data.testsFailed,
        tests_skipped: data.testsSkipped,
        coverage_lines: data.coverageLines,
        coverage_functions: data.coverageFunctions,
        coverage_branches: data.coverageBranches,
        build_time_ms: data.buildTimeMs,
        bundle_size_bytes: data.bundleSizeBytes,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return result as QualitySnapshot
  },

  async getLatestSnapshot(companyId: string): Promise<QualitySnapshot | null> {
    const { data, error } = await supabase
      .from('quality_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as QualitySnapshot | null
  },

  async setBaseline(
    companyId: string,
    metricName: string,
    metricValue: number,
    setBy: string
  ): Promise<QualityBaseline> {
    const { data: existing } = await supabase
      .from('quality_baselines')
      .select('id')
      .eq('company_id', companyId)
      .eq('metric_name', metricName)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('quality_baselines')
        .update({
          metric_value: metricValue,
          set_by: setBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data as QualityBaseline
    }

    const { data, error } = await supabase
      .from('quality_baselines')
      .insert({
        company_id: companyId,
        metric_name: metricName,
        metric_value: metricValue,
        set_by: setBy,
      })
      .select()
      .single()

    if (error) throw error
    return data as QualityBaseline
  },

  async getBaselines(companyId: string): Promise<QualityBaseline[]> {
    const { data, error } = await supabase
      .from('quality_baselines')
      .select('*')
      .eq('company_id', companyId)
      .order('metric_name', { ascending: true })

    if (error) throw error
    return (data ?? []) as QualityBaseline[]
  },

  async checkRegression(
    companyId: string,
    current: {
      testsPassed: number
      testsFailed: number
      coverageLines: number
      coverageFunctions: number
      coverageBranches: number
      buildTimeMs: number
      bundleSizeBytes: number
    }
  ): Promise<RegressionCheck[]> {
    const baselines = await this.getBaselines(companyId)
    const baselineMap = new Map(baselines.map((b) => [b.metric_name, b.metric_value]))

    const currentMap: Record<string, number> = {
      tests_passed: current.testsPassed,
      tests_failed: current.testsFailed,
      coverage_lines: current.coverageLines,
      coverage_functions: current.coverageFunctions,
      coverage_branches: current.coverageBranches,
      build_time_ms: current.buildTimeMs,
      bundle_size_bytes: current.bundleSizeBytes,
    }

    return Object.entries(currentMap)
      .filter(([metric]) => baselineMap.has(metric))
      .map(([metric, currentValue]) => {
        const baselineValue = baselineMap.get(metric)!
        const dp = deltaPercent(currentValue, baselineValue)
        const threshold = REGRESSION_THRESHOLDS[metric] ?? -5

        let regressed: boolean
        if (metric === 'tests_failed') {
          regressed = dp > -(REGRESSION_THRESHOLDS[metric] ?? 10)
        } else {
          regressed = dp < threshold
        }

        return {
          metric,
          baseline: baselineValue,
          current: currentValue,
          delta: currentValue - baselineValue,
          deltaPercent: Number(dp.toFixed(2)),
          regressed,
        }
      })
  },

  async getTrends(
    companyId: string,
    days = 30
  ): Promise<QualitySnapshot[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('quality_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as QualitySnapshot[]
  },

  async generateReport(companyId: string): Promise<QualityReport> {
    const [snapshot, baselines] = await Promise.all([
      this.getLatestSnapshot(companyId),
      this.getBaselines(companyId),
    ])

    let regressions: RegressionCheck[] = []

    if (snapshot) {
      regressions = await this.checkRegression(companyId, {
        testsPassed: snapshot.tests_passed,
        testsFailed: snapshot.tests_failed,
        coverageLines: snapshot.coverage_lines,
        coverageFunctions: snapshot.coverage_functions,
        coverageBranches: snapshot.coverage_branches,
        buildTimeMs: snapshot.build_time_ms,
        bundleSizeBytes: snapshot.bundle_size_bytes,
      })
    }

    return {
      companyId,
      snapshot,
      baselines,
      regressions,
      passed: !regressions.some((r) => r.regressed),
      generatedAt: new Date().toISOString(),
    }
  },
}
