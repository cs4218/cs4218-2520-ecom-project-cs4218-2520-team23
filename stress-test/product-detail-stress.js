// Dong Cheng-Yu A0262348B
//
// Tested endpoints:
// - GET /api/v1/product/search/:keyword,
// - GET /api/v1/product/get-product/:slug
// Example usage:
// - From repo root: mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/product-detail-stress.js --env BASE_URL=http://localhost:6060 --env SEARCH_SEEDS_FILE=./stress-test/product-detail-search-seeds.csv --env SLUGS_FILE=./stress-test/product-detail-slugs.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env DETAIL_P95_ABORT_MS=999999 --env SEARCH_P95_ABORT_MS=999999 --summary-export ./stress-test/results/product-detail-stress-summary.json
// - From stress-test/: mkdir -p ./results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./product-detail-stress.js --env BASE_URL=http://localhost:6060 --env SEARCH_SEEDS_FILE=./product-detail-search-seeds.csv --env SLUGS_FILE=./product-detail-slugs.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env DETAIL_P95_ABORT_MS=999999 --env SEARCH_P95_ABORT_MS=999999 --summary-export ./results/product-detail-stress-summary.json
import http from 'k6/http';
import { check, group } from 'k6';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const SEARCH_FIRST = (__ENV.SEARCH_FIRST || 'true').toLowerCase() === 'true';
const SEARCH_SEEDS_FILE = __ENV.SEARCH_SEEDS_FILE || './product-detail-search-seeds.csv';
const SLUGS_FILE = __ENV.SLUGS_FILE || './product-detail-slugs.csv';

const START_RATE = Number(__ENV.START_RATE || __ENV.BASELINE_RATE || 20);
const RATE_STEP = Number(__ENV.RATE_STEP || __ENV.STEP_RATE || 20);
const STEP_DURATION_SEC = Number(__ENV.STEP_DURATION_SEC || 10);
// Safety fuse only. Real stop condition should be abort-on-fail thresholds below.
const MAX_STEPS = Number(__ENV.MAX_STEPS || 59);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 100);
const MAX_VUS = Number(__ENV.MAX_VUS || 2000);
const FAIL_RATE_ABORT = Number(__ENV.FAIL_RATE_ABORT || 0.05);
const DETAIL_P95_ABORT_MS = Number(__ENV.DETAIL_P95_ABORT_MS || 2000);
const SEARCH_P95_ABORT_MS = Number(__ENV.SEARCH_P95_ABORT_MS || 2000);
const ABORT_EVAL_DELAY_SEC = Number(__ENV.ABORT_EVAL_DELAY_SEC || 30);

const detailLatency = new Trend('detail_only_latency_ms');
const searchLatency = new Trend('detail_seed_search_latency_ms');
const detailSuccessRate = new Rate('detail_only_success_rate');
const searchSuccessRate = new Rate('detail_seed_search_success_rate');
const detailNotFoundRate = new Rate('detail_not_found_rate');
const slugResolvedRate = new Rate('detail_slug_resolved_rate');
const targetRateRps = new Trend('detail_target_rate_rps');

function parseCsv(csv) {
  return csv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function openWithFallback(inputPath, fallbackPath) {
  const candidates = [
    inputPath,
    fallbackPath,
    inputPath.replace('./stress-test/', './').replace('stress-test/', './'),
    inputPath.replace('./performance/k6/', './').replace('performance/k6/', './'),
  ];
  for (const path of candidates) {
    try {
      return open(path);
    } catch (error) {
      // Try next candidate.
    }
  }
  throw new Error(`Unable to open CSV. Tried: ${candidates.join(', ')}`);
}

const searchSeeds = new SharedArray('detail-search-seeds', function loadSeeds() {
  const csv = openWithFallback(
    SEARCH_SEEDS_FILE,
    SEARCH_SEEDS_FILE.replace('./performance/k6/', './').replace('performance/k6/', './')
  );
  return parseCsv(csv);
});

const directSlugs = new SharedArray('detail-direct-slugs', function loadSlugs() {
  const csv = openWithFallback(
    SLUGS_FILE,
    SLUGS_FILE.replace('./performance/k6/', './').replace('performance/k6/', './')
  );
  return parseCsv(csv);
});

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildStages() {
  const stages = [];
  stages.push({ duration: `${STEP_DURATION_SEC}s`, target: START_RATE });
  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const target = START_RATE + step * RATE_STEP;
    stages.push({ duration: `${STEP_DURATION_SEC}s`, target });
  }
  return stages;
}

const stages = buildStages();

const stageBoundariesSec = [];
let elapsedSec = 0;
for (const stage of stages) {
  elapsedSec += Number(String(stage.duration).replace('s', ''));
  stageBoundariesSec.push(elapsedSec);
}

function currentTargetRate() {
  const elapsed = exec.instance.currentTestRunDuration / 1000;
  for (let i = 0; i < stageBoundariesSec.length; i += 1) {
    if (elapsed <= stageBoundariesSec[i]) {
      return stages[i].target;
    }
  }
  return stages[stages.length - 1].target;
}

export const options = {
  scenarios: {
    product_detail_stress: {
      executor: 'ramping-arrival-rate',
      startRate: START_RATE,
      timeUnit: '1s',
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
      stages,
    },
  },
  thresholds: {
    http_req_failed: [
      {
        threshold: `rate<${FAIL_RATE_ABORT}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    detail_only_success_rate: ['rate>0.80'],
    detail_only_latency_ms: [
      {
        threshold: `p(95)<${DETAIL_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    detail_seed_search_latency_ms: [
      {
        threshold: `p(95)<${SEARCH_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    detail_slug_resolved_rate: ['rate>0.80'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  let slug = null;
  targetRateRps.add(currentTargetRate());

  group('resolve-slug', function () {
    if (SEARCH_FIRST) {
      const keyword = encodeURIComponent(pickRandom(searchSeeds));
      const searchRes = http.get(`${BASE_URL}/api/v1/product/search/${keyword}`, {
        tags: { endpoint: 'search-product', phase: 'resolve-slug' },
        headers: { Accept: 'application/json' },
        timeout: '20s',
      });

      searchLatency.add(searchRes.timings.duration);
      const searchOk = check(searchRes, {
        'seed search status is 200': (r) => r.status === 200,
      });
      searchSuccessRate.add(searchOk);

      if (searchOk) {
        try {
          const payload = searchRes.json();
          if (Array.isArray(payload) && payload.length > 0) {
            const picked = pickRandom(payload);
            slug = picked?.slug || null;
          }
        } catch (error) {
          slug = null;
        }
      }
    } else if (directSlugs.length > 0) {
      slug = pickRandom(directSlugs);
    }
  });

  slugResolvedRate.add(Boolean(slug));
  if (!slug) {
    return;
  }

  const detailRes = http.get(`${BASE_URL}/api/v1/product/get-product/${slug}`, {
    tags: { endpoint: 'get-product', phase: 'detail-only' },
    headers: { Accept: 'application/json' },
    timeout: '20s',
  });

  detailLatency.add(detailRes.timings.duration);
  const detailOk = check(detailRes, {
    'detail status is 200': (r) => r.status === 200,
  });
  detailSuccessRate.add(detailOk);
  detailNotFoundRate.add(detailRes.status === 404);
}
