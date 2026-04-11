// Dong Cheng-Yu A0262348B
//
// Tested endpoints:
// - GET /api/v1/product/get-product,
// - GET /api/v1/category/get-category,
// - GET /api/v1/product/product-category/:slug
// Example usage:
// - From repo root (gentler ramp, ~10 min): mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/homepage-listing-stress.js --env BASE_URL=http://localhost:6060 --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env HOMEPAGE_P95_ABORT_MS=999999 --env CATEGORY_LIST_P95_ABORT_MS=999999 --env CATEGORY_FILTER_P95_ABORT_MS=999999 --env JOURNEY_P95_ABORT_MS=999999 --summary-export ./stress-test/results/homepage-listing-stress-summary.json
// - From stress-test/ (gentler ramp, ~10 min): mkdir -p ./results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./homepage-listing-stress.js --env BASE_URL=http://localhost:6060 --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env HOMEPAGE_P95_ABORT_MS=999999 --env CATEGORY_LIST_P95_ABORT_MS=999999 --env CATEGORY_FILTER_P95_ABORT_MS=999999 --env JOURNEY_P95_ABORT_MS=999999 --summary-export ./results/homepage-listing-stress-summary.json
import http from 'k6/http';
import { check, group } from 'k6';
import exec from 'k6/execution';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

const START_RATE = Number(__ENV.START_RATE || __ENV.BASELINE_RATE || __ENV.BASELINE_USERS || 20);
const RATE_STEP = Number(__ENV.RATE_STEP || __ENV.STEP_RATE || __ENV.STEP_USERS || 30);
const STEP_DURATION_SEC = Number(__ENV.STEP_DURATION_SEC || 10);
// Safety fuse only. Real stop condition should be abort-on-fail thresholds below.
const MAX_STEPS = Number(__ENV.MAX_STEPS || 59);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 100);
const MAX_VUS = Number(__ENV.MAX_VUS || 2000);
const FAIL_RATE_ABORT = Number(__ENV.FAIL_RATE_ABORT || 0.05);
const HOMEPAGE_P95_ABORT_MS = Number(__ENV.HOMEPAGE_P95_ABORT_MS || 3000);
const CATEGORY_LIST_P95_ABORT_MS = Number(__ENV.CATEGORY_LIST_P95_ABORT_MS || 3000);
const CATEGORY_FILTER_P95_ABORT_MS = Number(__ENV.CATEGORY_FILTER_P95_ABORT_MS || 3000);
const JOURNEY_P95_ABORT_MS = Number(__ENV.JOURNEY_P95_ABORT_MS || 5000);
const ABORT_EVAL_DELAY_SEC = Number(__ENV.ABORT_EVAL_DELAY_SEC || 30);

const homepageLatency = new Trend('homepage_get_product_latency_ms');
const categoryListLatency = new Trend('homepage_get_category_latency_ms');
const categoryFilterLatency = new Trend('homepage_category_filter_latency_ms');
const journeyLatency = new Trend('homepage_browse_journey_latency_ms');

const homepageSuccessRate = new Rate('homepage_get_product_success_rate');
const categoryListSuccessRate = new Rate('homepage_get_category_success_rate');
const categoryFilterSuccessRate = new Rate('homepage_category_filter_success_rate');
const journeySuccessRate = new Rate('homepage_browse_journey_success_rate');
const categoryResolvedRate = new Rate('homepage_category_slug_resolved_rate');
const targetRateRps = new Trend('homepage_target_rate_rps');

const categoryFilterSkipped = new Counter('homepage_category_filter_skipped_count');

function buildStages() {
  const stages = [];

  // Continuously increase load without peak hold or ramp down.
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
    homepage_listing_stress: {
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
    homepage_get_product_success_rate: ['rate>0.85'],
    homepage_get_category_success_rate: ['rate>0.85'],
    homepage_category_filter_success_rate: ['rate>0.80'],
    homepage_browse_journey_success_rate: ['rate>0.75'],
    homepage_get_product_latency_ms: [
      {
        threshold: `p(95)<${HOMEPAGE_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    homepage_get_category_latency_ms: [
      {
        threshold: `p(95)<${CATEGORY_LIST_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    homepage_category_filter_latency_ms: [
      {
        threshold: `p(95)<${CATEGORY_FILTER_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    homepage_browse_journey_latency_ms: [
      {
        threshold: `p(95)<${JOURNEY_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function () {
  const startedAt = Date.now();
  targetRateRps.add(currentTargetRate());

  let homepageOk = false;
  let categoryListOk = false;
  let categoryFilterOk = true;

  group('homepage-browse-journey', function () {
    const homepageRes = http.get(`${BASE_URL}/api/v1/product/get-product`, {
      tags: { endpoint: 'get-product' },
      headers: { Accept: 'application/json' },
      timeout: '20s',
    });

    homepageLatency.add(homepageRes.timings.duration);
    homepageOk = check(homepageRes, {
      'homepage list status is 200': (r) => r.status === 200,
    });
    homepageSuccessRate.add(homepageOk);

    const categoryRes = http.get(`${BASE_URL}/api/v1/category/get-category`, {
      tags: { endpoint: 'get-category' },
      headers: { Accept: 'application/json' },
      timeout: '20s',
    });

    categoryListLatency.add(categoryRes.timings.duration);
    categoryListOk = check(categoryRes, {
      'category list status is 200': (r) => r.status === 200,
    });
    categoryListSuccessRate.add(categoryListOk);

    if (!categoryListOk) {
      categoryResolvedRate.add(false);
      categoryFilterSkipped.add(1);
      return;
    }

    let categories = [];
    try {
      categories = categoryRes.json('category') || [];
    } catch (error) {
      categories = [];
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      categoryResolvedRate.add(false);
      categoryFilterSkipped.add(1);
      return;
    }

    const selected = pickRandom(categories);
    const categorySlug = selected?.slug || null;
    const categoryId = selected?._id || selected?.id || null;
    const filterValue = categorySlug || categoryId;

    const hasFilterValue = Boolean(filterValue);
    categoryResolvedRate.add(hasFilterValue);

    if (!hasFilterValue) {
      categoryFilterSkipped.add(1);
      return;
    }

    const filterRes = http.get(
      `${BASE_URL}/api/v1/product/product-category/${encodeURIComponent(filterValue)}`,
      {
        tags: { endpoint: 'product-category' },
        headers: { Accept: 'application/json' },
        timeout: '20s',
      }
    );

    categoryFilterLatency.add(filterRes.timings.duration);
    categoryFilterOk = check(filterRes, {
      'category-filter status is 200': (r) => r.status === 200,
    });
    categoryFilterSuccessRate.add(categoryFilterOk);
  });

  journeyLatency.add(Date.now() - startedAt);
  journeySuccessRate.add(homepageOk && categoryListOk && categoryFilterOk);
}
