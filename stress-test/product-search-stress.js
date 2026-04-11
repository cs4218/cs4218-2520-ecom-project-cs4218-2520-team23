// Dong Cheng-Yu A0262348B
//
// Tested endpoints:
// - GET /api/v1/product/search/:keyword,
// - GET /api/v1/product/get-product/:slug,
// - GET /api/v1/product/related-product/:pid/:cid
// Example usage:
// - From repo root: mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/product-search-stress.js --env BASE_URL=http://localhost:6060 --env KEYWORDS_FILE=./stress-test/product-search-keywords.csv --env FAIL_RATE_ABORT=0.05 --env SEARCH_P95_ABORT_MS=999999 --env JOURNEY_P95_ABORT_MS=999999 --summary-export ./stress-test/results/product-search-stress-summary.json
// - From stress-test/: mkdir -p ./results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./product-search-stress.js --env BASE_URL=http://localhost:6060 --env KEYWORDS_FILE=./product-search-keywords.csv --env FAIL_RATE_ABORT=0.05 --env SEARCH_P95_ABORT_MS=999999 --env JOURNEY_P95_ABORT_MS=999999 --summary-export ./results/product-search-stress-summary.json
import http from "k6/http";
import { check, group } from "k6";
import exec from "k6/execution";
import { SharedArray } from "k6/data";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const KEYWORDS_FILE = __ENV.KEYWORDS_FILE || "./product-search-keywords.csv";

const START_RATE = Number(
  __ENV.START_RATE || __ENV.BASELINE_RATE || __ENV.BASELINE_USERS || 15,
);
const RATE_STEP = Number(
  __ENV.RATE_STEP || __ENV.STEP_RATE || __ENV.STEP_USERS || 20,
);
const STEP_DURATION_SEC = Number(__ENV.STEP_DURATION_SEC || 10);
// Safety fuse only. Real stop condition should be abort-on-fail thresholds below.
const MAX_STEPS = Number(__ENV.MAX_STEPS || 59);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 100);
const MAX_VUS = Number(__ENV.MAX_VUS || 2000);
const FAIL_RATE_ABORT = Number(__ENV.FAIL_RATE_ABORT || 0.05);
const SEARCH_P95_ABORT_MS = Number(__ENV.SEARCH_P95_ABORT_MS || 2000);
const JOURNEY_P95_ABORT_MS = Number(__ENV.JOURNEY_P95_ABORT_MS || 4000);
const ABORT_EVAL_DELAY_SEC = Number(__ENV.ABORT_EVAL_DELAY_SEC || 30);

const searchLatency = new Trend("search_latency_ms");
const detailLatency = new Trend("detail_latency_ms");
const relatedLatency = new Trend("related_latency_ms");
const journeyLatency = new Trend("journey_latency_ms");

const noResultRate = new Rate("no_result_rate");
const searchSuccessRate = new Rate("search_success_rate");
const detailSuccessRate = new Rate("detail_success_rate");
const relatedSuccessRate = new Rate("related_success_rate");
const journeySuccessRate = new Rate("journey_success_rate");
const targetRateRps = new Trend("target_rate_rps");

const skippedDetailRelated = new Counter("skipped_detail_related_count");

function parseKeywordCsv(csv) {
  return csv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function loadKeywordsFromCandidates() {
  const candidates = [
    KEYWORDS_FILE,
    KEYWORDS_FILE.replace("./performance/k6/", "./"),
    KEYWORDS_FILE.replace("performance/k6/", "./"),
  ];

  for (const candidate of candidates) {
    try {
      return parseKeywordCsv(open(candidate));
    } catch (error) {
      // Try next candidate.
    }
  }

  throw new Error(
    `Unable to open keywords CSV. Tried: ${candidates.join(", ")}`,
  );
}

const keywords = new SharedArray("keywords", function loadKeywords() {
  return loadKeywordsFromCandidates();
});

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildStages() {
  const stages = [];

  // Continuously increase load without a peak hold or ramp down.
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
  elapsedSec += Number(String(stage.duration).replace("s", ""));
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
    product_search_stress: {
      executor: "ramping-arrival-rate",
      startRate: START_RATE,
      timeUnit: "1s",
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
    search_success_rate: ["rate>0.85"],
    detail_success_rate: ["rate>0.85"],
    related_success_rate: ["rate>0.85"],
    journey_success_rate: ["rate>0.80"],
    search_latency_ms: [
      {
        threshold: `p(95)<${SEARCH_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    journey_latency_ms: [
      {
        threshold: `p(95)<${JOURNEY_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export default function () {
  const keyword = encodeURIComponent(pickRandom(keywords));
  const journeyStart = Date.now();
  targetRateRps.add(currentTargetRate());

  let searchOk = false;
  let detailOk = true;
  let relatedOk = true;

  group("search-detail-related-journey", function () {
    const searchRes = http.get(`${BASE_URL}/api/v1/product/search/${keyword}`, {
      tags: { endpoint: "search-product" },
      headers: { Accept: "application/json" },
      timeout: "20s",
    });

    searchLatency.add(searchRes.timings.duration);
    searchOk = check(searchRes, {
      "search status is 200": (r) => r.status === 200,
    });
    searchSuccessRate.add(searchOk);

    let products = [];
    if (searchOk) {
      try {
        const payload = searchRes.json();
        if (Array.isArray(payload)) {
          products = payload;
        }
      } catch (error) {
        products = [];
      }
    }

    const hasResults = products.length > 0;
    noResultRate.add(!hasResults);

    if (!hasResults) {
      skippedDetailRelated.add(1);
      return;
    }

    const picked = pickRandom(products);
    const slug = picked?.slug;
    const pid = picked?._id || picked?.id;
    const category = picked?.category;
    const cid =
      typeof category === "object" && category !== null
        ? category._id || category.id
        : category;

    if (!slug || !pid || !cid) {
      skippedDetailRelated.add(1);
      return;
    }

    const detailRes = http.get(
      `${BASE_URL}/api/v1/product/get-product/${slug}`,
      {
        tags: { endpoint: "get-product" },
        headers: { Accept: "application/json" },
        timeout: "20s",
      },
    );

    detailLatency.add(detailRes.timings.duration);
    detailOk = check(detailRes, {
      "detail status is 200": (r) => r.status === 200,
    });
    detailSuccessRate.add(detailOk);

    const relatedRes = http.get(
      `${BASE_URL}/api/v1/product/related-product/${pid}/${cid}`,
      {
        tags: { endpoint: "related-product" },
        headers: { Accept: "application/json" },
        timeout: "20s",
      },
    );

    relatedLatency.add(relatedRes.timings.duration);
    relatedOk = check(relatedRes, {
      "related status is 200": (r) => r.status === 200,
    });
    relatedSuccessRate.add(relatedOk);
  });

  journeyLatency.add(Date.now() - journeyStart);
  journeySuccessRate.add(searchOk && detailOk && relatedOk);
}
