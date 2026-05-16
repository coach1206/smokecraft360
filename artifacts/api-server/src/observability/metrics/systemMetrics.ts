/**
 * systemMetrics — Node.js process and infrastructure metrics.
 *
 * Collects: heap, RSS, event loop lag, GC pressure, uptime.
 * Runs on a 15s interval and publishes to metricsCollector gauges.
 */

import { setGauge, observe } from "../../platform/observability/metricsCollector";

let lastLoopCheck = Date.now();
let eventLoopLagMs = 0;

function measureEventLoopLag(): void {
  const start = Date.now();
  setImmediate(() => {
    eventLoopLagMs = Date.now() - start;
  });
}

function collectSystemMetrics(): void {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();

  setGauge("system", "heap_used_mb",    mem.heapUsed  / 1024 / 1024);
  setGauge("system", "heap_total_mb",   mem.heapTotal / 1024 / 1024);
  setGauge("system", "rss_mb",          mem.rss       / 1024 / 1024);
  setGauge("system", "external_mb",     mem.external  / 1024 / 1024);
  setGauge("system", "uptime_s",        Math.round(process.uptime()));
  setGauge("system", "event_loop_lag_ms", eventLoopLagMs);
  setGauge("system", "cpu_user_ms",     cpu.user   / 1000);
  setGauge("system", "cpu_system_ms",   cpu.system / 1000);

  observe("system", "heap_used_mb",      mem.heapUsed  / 1024 / 1024);
  observe("system", "event_loop_lag_ms", eventLoopLagMs);

  measureEventLoopLag();
}

// Start collection
measureEventLoopLag();
const timer = setInterval(collectSystemMetrics, 15_000);
timer.unref();
collectSystemMetrics();

export function getSystemSnapshot() {
  const mem = process.memoryUsage();
  return {
    heapUsedMb:   Math.round(mem.heapUsed  / 1024 / 1024),
    heapTotalMb:  Math.round(mem.heapTotal / 1024 / 1024),
    rssMb:        Math.round(mem.rss       / 1024 / 1024),
    eventLoopLagMs,
    uptimeS:      Math.round(process.uptime()),
    nodeVersion:  process.version,
    platform:     process.platform,
  };
}
