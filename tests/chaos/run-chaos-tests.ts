#!/usr/bin/env node

/**
 * Chaos Test Runner
 * Runs all chaos test suites in parallel with reporting
 *
 * Usage:
 *   npx tsx tests/chaos/run-chaos-tests.ts
 *   npx vitest run tests/chaos/ --reporter=verbose
 */

import { execSync } from 'child_process'

const testSuites = [
  'tests/chaos/webhook.chaos.test.ts',
  'tests/chaos/database.chaos.test.ts',
  'tests/chaos/messaging.chaos.test.ts',
  'tests/chaos/integration.chaos.test.ts',
]

console.log('🌀 Running Chaos Test Suite')
console.log('='.repeat(50))
console.log(`Found ${testSuites.length} test suites`)
console.log()

const startTime = Date.now()

try {
  const command = `npx vitest run ${testSuites.join(' ')} --reporter=verbose --reporter=json --outputFile=tests/chaos/results.json`

  console.log('Executing:', command)
  console.log()

  execSync(command, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log()
  console.log('='.repeat(50))
  console.log(`✅ All chaos tests completed in ${duration}s`)

} catch (error) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log()
  console.log('='.repeat(50))
  console.log(`❌ Chaos tests failed after ${duration}s`)
  process.exit(1)
}