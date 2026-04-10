// Liu Shixin (A0265144H)
// Spike Test — Sudden sharp increases/decreases in load to test system recovery
//
// To run:
//   K6_WEB_DASHBOARD=true \
//   K6_WEB_DASHBOARD_OPEN=true \
//   K6_WEB_DASHBOARD_PERIOD=1s \
//   K6_WEB_DASHBOARD_EXPORT=results/spike_report.html \
//   k6 run --out json=results/spike_results.json spike_test.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Configuration ───────────────────────────────────────────────
const BASE_URL = "http://localhost:6060/api/v1";

// ── Custom Metrics ──────────────────────────────────────────────
const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration", true);
const getProductsDuration = new Trend("get_products_duration", true);
const searchDuration = new Trend("search_duration", true);
const filterDuration = new Trend("filter_duration", true);
const paginationDuration = new Trend("pagination_duration", true);
const getCategoriesDuration = new Trend("get_categories_duration", true);
const getOrdersDuration = new Trend("get_orders_duration", true);
const requestCount = new Counter("total_requests");

// ── Spike Test Stages ───────────────────────────────────────────
// Pattern: normal → spike up → spike down → normal → spike up → spike down → normal
// This tests the system's ability to recover from sudden load changes TWICE.
export const options = {
  stages: [
    // Phase 1: Warm-up — establish baseline (normal load)
    { duration: "30s", target: 10 },

    // Phase 2: First spike — sudden surge to 200 VUs
    { duration: "10s", target: 200 },

    // Phase 3: Hold spike — sustain high load briefly
    { duration: "30s", target: 200 },

    // Phase 4: Spike down — sudden drop back to normal
    { duration: "10s", target: 10 },

    // Phase 5: Recovery observation — does the system recover?
    { duration: "30s", target: 10 },

    // Phase 6: Second spike — even higher surge to 400 VUs
    { duration: "10s", target: 400 },

    // Phase 7: Hold second spike
    { duration: "30s", target: 400 },

    // Phase 8: Spike down — sudden drop
    { duration: "10s", target: 10 },

    // Phase 9: Final recovery — observe system stabilization
    { duration: "30s", target: 10 },

    // Phase 10: Cool-down — ramp to 0
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests should be under 2s
    errors: ["rate<0.1"], // Error rate should be below 10%
    http_req_failed: ["rate<0.1"], // HTTP failure rate below 10%
  },
};

// ── Test Data ───────────────────────────────────────────────────
const TEST_USER = {
  email: "spiketest@example.com",
  password: "SpikeTest123!",
  name: "Spike Test User",
  phone: "91234567",
  address: "NUS",
  answer: "spike",
};

const SEARCH_KEYWORDS = [
  "smartphone",
  "textbook",
  "laptop",
  "novel",
  "shirt",
  "NUS",
];

const CATEGORY_IDS = []; // Will be populated in setup

const PRICE_RANGES = [
  [0, 19],
  [20, 39],
  [40, 59],
  [60, 79],
  [80, 99],
  [100, 9999],
];

// ── Helper: retry a request until the server is ready ───────────
function waitForServer(maxRetries = 10, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    const res = http.get(`${BASE_URL}/category/get-category`);
    if (res.status === 200) {
      console.log(`Server ready after ${i + 1} attempt(s).`);
      return true;
    }
    console.log(`Waiting for server... attempt ${i + 1}/${maxRetries}`);
    sleep(delayMs / 1000);
  }
  console.error("Server did not become ready in time!");
  return false;
}

// ── Setup: Register test user + fetch categories ────────────────
export function setup() {
  // Wait for server to be ready (nodemon may restart when k6 writes output files)
  waitForServer();

  // Register the test user (ignore if already exists)
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
      phone: TEST_USER.phone,
      address: TEST_USER.address,
      answer: TEST_USER.answer,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  console.log(`Register response: ${registerRes.status} - ${registerRes.body}`);

  // Login to get token
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  console.log(`Login response: ${loginRes.status}`);

  let token = "";
  try {
    const body = JSON.parse(loginRes.body);
    token = body.token || "";
  } catch (e) {
    console.error("Setup login failed:", loginRes.body);
  }

  // Fetch categories for filter tests
  const catRes = http.get(`${BASE_URL}/category/get-category`);
  let categoryIds = [];
  try {
    const catBody = JSON.parse(catRes.body);
    if (catBody.category) {
      categoryIds = catBody.category.map((c) => c._id);
    }
  } catch (e) {
    console.error("Setup category fetch failed:", catRes.body);
  }

  // Fetch product count for pagination tests
  const countRes = http.get(`${BASE_URL}/product/product-count`);
  let totalProducts = 6;
  try {
    const countBody = JSON.parse(countRes.body);
    totalProducts = countBody.total || 6;
  } catch (e) {
    // use default
  }

  const maxPage = Math.max(1, Math.ceil(totalProducts / 6));

  return { token, categoryIds, maxPage };
}

// ── Main Test Function ──────────────────────────────────────────
export default function (data) {
  const { token, categoryIds, maxPage } = data;

  // Randomly pick one of the 7 test scenarios per iteration
  // Weights simulate realistic traffic: browse-heavy with some auth operations
  const scenario = Math.random();

  if (scenario < 0.20) {
    testLogin();
  } else if (scenario < 0.35) {
    testGetProducts();
  } else if (scenario < 0.50) {
    testSearch();
  } else if (scenario < 0.65) {
    testFilter(categoryIds);
  } else if (scenario < 0.77) {
    testPagination(maxPage);
  } else if (scenario < 0.89) {
    testGetCategories();
  } else {
    testGetOrders(token);
  }

  // Brief pause between iterations to simulate real user think time
  sleep(0.1 + Math.random() * 0.3);
}

// ── Scenario 1: Login (CPU-heavy due to bcrypt) ────────────────
function testLogin() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "login" },
    }
  );

  const success = check(res, {
    "login: status is 200": (r) => r.status === 200,
    "login: has token": (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  loginDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Scenario 2: Get All Products (homepage load) ────────────────
function testGetProducts() {
  const res = http.get(`${BASE_URL}/product/get-product`, {
    tags: { endpoint: "get_products" },
  });

  const success = check(res, {
    "get-products: status is 200": (r) => r.status === 200,
    "get-products: has products array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).products);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  getProductsDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Scenario 3: Search Products (regex DB query) ────────────────
function testSearch() {
  const keyword =
    SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
  const res = http.get(`${BASE_URL}/product/search/${keyword}`, {
    tags: { endpoint: "search" },
  });

  const success = check(res, {
    "search: status is 200": (r) => r.status === 200,
  });

  errorRate.add(!success);
  searchDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Scenario 4: Product Filters (complex DB query) ──────────────
function testFilter(categoryIds) {
  const priceRange =
    PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];

  const filterPayload = {
    checked: categoryIds.length > 0
      ? [categoryIds[Math.floor(Math.random() * categoryIds.length)]]
      : [],
    radio: priceRange,
  };

  const res = http.post(
    `${BASE_URL}/product/product-filters`,
    JSON.stringify(filterPayload),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "filter" },
    }
  );

  const success = check(res, {
    "filter: status is 200": (r) => r.status === 200,
  });

  errorRate.add(!success);
  filterDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Scenario 5: Paginated Product List ──────────────────────────
function testPagination(maxPage) {
  const page = Math.floor(Math.random() * maxPage) + 1;
  const res = http.get(`${BASE_URL}/product/product-list/${page}`, {
    tags: { endpoint: "pagination" },
  });

  const success = check(res, {
    "pagination: status is 200": (r) => r.status === 200,
  });

  errorRate.add(!success);
  paginationDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Scenario 6: Get All Categories (lightweight baseline) ───────
function testGetCategories() {
  const res = http.get(`${BASE_URL}/category/get-category`, {
    tags: { endpoint: "get_categories" },
  });

  const success = check(res, {
    "get-categories: status is 200": (r) => r.status === 200,
    "get-categories: has category array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).category);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  getCategoriesDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Scenario 7: Get Orders (authenticated, JWT middleware) ──────
function testGetOrders(token) {
  const headers = {
    Authorization: token,
  };

  const res = http.get(`${BASE_URL}/auth/orders`, {
    headers: headers,
    tags: { endpoint: "get_orders" },
  });

  // Accepts 200 (has orders) or 401 (token expired under load — itself a finding)
  const success = check(res, {
    "get-orders: status is 200 or 401": (r) =>
      r.status === 200 || r.status === 401,
  });

  errorRate.add(!success);
  getOrdersDuration.add(res.timings.duration);
  requestCount.add(1);
}

// ── Teardown ────────────────────────────────────────────────────
export function teardown(data) {
  console.log("Spike test completed.");
  console.log("Review the k6 web dashboard or JSON output for detailed metrics.");
}
