/**
 * scripts/benchmark.ts
 * Pipeline performance benchmark — measures throughput and latency
 * of the QRIS decode + Invisible Filter pipeline.
 *
 * Run: npx ts-node scripts/benchmark.ts
 */

const SAMPLE_QRIS = [
  '00020101021226610014ID.CO.BCA.WWW011893600014301234520208ABCDE67890303UMI51440014ID.CO.QRIS.WWW0215ID10260012345670303UMI5204598153033605802ID5914WARUNG BU SARI6013JAKARTA SEL61051213062070703A016304E1B2',
  '00020101021226610014ID.CO.OVO.WWW011893600014302345670208XYZU12345030308901234551440014ID.CO.QRIS.WWW0215ID10260098765430303UMI52044511530336058021D5910TOKO HARTO6013JAKARTA TIM61051363062070703B026304A2C3',
];

interface BenchResult {
  iteration: number;
  durationMs: number;
  nmid: string | null;
  success: boolean;
}

async function runBenchmark(iterations = 50): Promise<void> {
  console.log(`\n🔬 Invisible Map Pipeline Benchmark`);
  console.log(`   Iterations: ${iterations}`);
  console.log(`   QRIS samples: ${SAMPLE_QRIS.length}\n`);

  const results: BenchResult[] = [];
  const { parseQris } = await import('../src/parser/emvco');

  for (let i = 0; i < iterations; i++) {
    const sample = SAMPLE_QRIS[i % SAMPLE_QRIS.length];
    const start = performance.now();

    let nmid: string | null = null;
    let success = false;

    try {
      const meta = parseQris(sample);
      nmid = meta.nmid;
      success = true;
    } catch {
      // Parse failed
    }

    const durationMs = performance.now() - start;
    results.push({ iteration: i + 1, durationMs, nmid, success });
  }

  // ── Stats ──
  const durations = results.map((r) => r.durationMs);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const max = Math.max(...durations);
  const min = Math.min(...durations);
  const successRate = (results.filter((r) => r.success).length / iterations) * 100;

  console.log(`📊 Results:`);
  console.log(`   Success rate: ${successRate.toFixed(1)}%`);
  console.log(`   Avg latency:  ${avg.toFixed(2)}ms`);
  console.log(`   Min latency:  ${min.toFixed(2)}ms`);
  console.log(`   Max latency:  ${max.toFixed(2)}ms`);
  console.log(`   Throughput:   ${(1000 / avg).toFixed(0)} ops/sec`);
  console.log('\n✅ Benchmark complete.');
}

runBenchmark(100).catch(console.error);
