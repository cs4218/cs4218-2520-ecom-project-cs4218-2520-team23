// Ng Hong Ray A0253509A
// Product/Category Soak Test
// To run: 
//  set "K6_WEB_DASHBOARD=true" 
//  set "K6_WEB_DASHBOARD_OPEN=true"
//  k6 run product_category_soak.js
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

//  test config
const BASE_URL = 'http://localhost:3000';
const SOAK_DURATION = '10s';
const REQUEST_RATE = 10;          // iterations per second
const PRE_ALLOCATED_VUS = 20;
const MAX_VUS = 100;

const PRODUCT_SLUGS = [
  'smartphone',
  'textbook',
  'laptop',
  'novel',
  'the-law-of-contract-in-singapore',
  'NUS-T-shirt'
];

const CATEGORY_SLUGS = [
  'electronics',
  'clothing',
  'books',
];

const SEARCH_KEYWORDS = [
  'smartphone',
  'textbook',
  'laptop',
  'novel',
  'contract',
  'shirt',
  'NUS',
];

const PAGE_SIZES = [6, 12, 24, 48];
const PAGE_NUMBERS = [1, 2, 3, 4];

// Request mix
const ENDPOINT_WEIGHTS = [
  { name: 'listProducts', weight: 45 },
  { name: 'getProductBySlug', weight: 20 },
  { name: 'getProductByCategory', weight: 20 },
  { name: 'searchProducts', weight: 15 },
];

//  metrics
export const dataConsistencyFailures = new Rate('data_consistency_failures');
export const endpointFailures = new Rate('endpoint_failures');
export const endpointCalls = new Counter('endpoint_calls');

// k6 options
export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  discardResponseBodies: false,
  scenarios: {
    product_category_soak: {
      executor: 'constant-arrival-rate',
      exec: 'productCategorySoak',
      rate: REQUEST_RATE,
      timeUnit: '1s',
      duration: SOAK_DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
      tags: {
        test_type: 'product_category_soak',
      },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200', 'p(99)<2500'],
    checks: ['rate>0.98'],
    //data_consistency_failures: ['rate<0.02'],
    endpoint_failures: ['rate<0.02'],

    'http_req_duration{endpoint:listProducts}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{endpoint:getProductBySlug}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{endpoint:getProductByCategory}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{endpoint:searchProducts}': ['p(95)<1500', 'p(99)<3000'],

    'http_req_failed{endpoint:listProducts}': ['rate<0.02'],
    'http_req_failed{endpoint:getProductBySlug}': ['rate<0.02'],
    'http_req_failed{endpoint:getProductByCategory}': ['rate<0.02'],
    'http_req_failed{endpoint:searchProducts}': ['rate<0.02'],
  },
};


// Main scenario
export function productCategorySoak() {
  const endpoint = weightedPick(ENDPOINT_WEIGHTS);

  if (endpoint === 'listProducts') {
    listProducts();
  } else if (endpoint === 'getProductBySlug') {
    getProductBySlug();
  } else if (endpoint === 'getProductByCategory') {
    getProductByCategory();
  } else {
    searchProducts();
  }
}

// Endpoints
function listProducts() {
  const page = pickRandom(PAGE_NUMBERS);
  const limit = pickRandom(PAGE_SIZES);

  const url = `${BASE_URL}/api/v1/product/get-product?page=${page}&limit=${limit}`;
  const params = buildParams('listProducts', {
    page: String(page),
    limit: String(limit),
  });

  endpointCalls.add(1, { endpoint: 'listProducts' });
  const res = http.get(url, params);

  const ok = check(res, {
    'listProducts status 200': (r) => r.status === 200,
    'listProducts body not empty': (r) => !!r.body && r.body.length > 0,
    'listProducts valid JSON': (r) => safeJson(r) !== null,
    'listProducts has product-list payload': (r) => {
      const body = safeJson(r);
      return looksLikeProductList(body);
    },
  });

  endpointFailures.add(!ok, { endpoint: 'listProducts' });

  const consistent = validateListResponse(res, limit);
  if (!consistent) {
    console.log(`FAILED listProducts | url=${url} | body=${res.body}`);
  }
  dataConsistencyFailures.add(!consistent, { endpoint: 'listProducts' });
}

function getProductBySlug() {
  const slug = pickRandom(PRODUCT_SLUGS);
  const url = `${BASE_URL}/api/v1/product/get-product/${encodeURIComponent(slug)}`;
  const params = buildParams('getProductBySlug', { slug });

  endpointCalls.add(1, { endpoint: 'getProductBySlug' });
  const res = http.get(url, params);

  const ok = check(res, {
    'getProductBySlug status 200': (r) => r.status === 200,
    'getProductBySlug body not empty': (r) => !!r.body && r.body.length > 0,
    'getProductBySlug valid JSON': (r) => safeJson(r) !== null,
    'getProductBySlug has product payload': (r) => {
      const body = safeJson(r);
      return looksLikeSingleProduct(body);
    },
  });

  endpointFailures.add(!ok, { endpoint: 'getProductBySlug' });

  const consistent = validateProductSlugResponse(res, slug);

  if (!consistent) {
    console.log(`FAILED getProductBySlug | url=${url} | body=${res.body}`);
  }
  dataConsistencyFailures.add(!consistent, { endpoint: 'getProductBySlug' });
}

function getProductByCategory() {
  const slug = pickRandom(CATEGORY_SLUGS);
  const page = pickRandom(PAGE_NUMBERS);
  const limit = pickRandom(PAGE_SIZES);

  const url = `${BASE_URL}/api/v1/product/product-category/${encodeURIComponent(slug)}?page=${page}&limit=${limit}`;
  const params = buildParams('getProductByCategory', {
    categorySlug: slug,
    page: String(page),
    limit: String(limit),
  });

  endpointCalls.add(1, { endpoint: 'getProductByCategory' });
  const res = http.get(url, params);

  const ok = check(res, {
    'getProductByCategory status 200': (r) => r.status === 200,
    'getProductByCategory body not empty': (r) => !!r.body && r.body.length > 0,
    'getProductByCategory valid JSON': (r) => safeJson(r) !== null,
    'getProductByCategory has category-list payload': (r) => {
      const body = safeJson(r);
      return looksLikeCategoryListing(body);
    },
  });

  endpointFailures.add(!ok, { endpoint: 'getProductByCategory' });

  const consistent = validateCategoryResponse(res, slug, limit);

  if (!consistent) {
    console.log(`FAILED getProductByCategory | url=${url} | body=${res.body}`);
  }
  dataConsistencyFailures.add(!consistent, { endpoint: 'getProductByCategory' });
}

function searchProducts() {
  const keyword = pickRandom(SEARCH_KEYWORDS);
  const limit = pickRandom(PAGE_SIZES);

  const url = `${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}?limit=${limit}`;
  const params = buildParams('searchProducts', {
    keyword,
    limit: String(limit),
  });

  endpointCalls.add(1, { endpoint: 'searchProducts' });
  const res = http.get(url, params);

  const ok = check(res, {
    'searchProducts status 200': (r) => r.status === 200,
    'searchProducts body not empty': (r) => !!r.body && r.body.length > 0,
    'searchProducts valid JSON': (r) => safeJson(r) !== null,
    'searchProducts has search payload': (r) => {
      const body = safeJson(r);
      return looksLikeSearchResults(body);
    },
  });

  endpointFailures.add(!ok, { endpoint: 'searchProducts' });

  const consistent = validateSearchResponse(res, keyword, limit);

  if (!consistent) {
    console.log(`FAILED searchProducts | url=${url} | body=${res.body}`);
  }
  dataConsistencyFailures.add(!consistent, { endpoint: 'searchProducts' });
}


//=================== Validation ===================
function validateListResponse(res, requestedLimit) {
  const body = safeJson(res);
  if (body === null) return false;

  const list = extractProductsArray(body);
  if (!Array.isArray(list)) return false;
  if (list.length === 0) return false;
  if (typeof requestedLimit === 'number' && list.length > requestedLimit * 2) return false;

  return list.every(isValidProductShape);
}

function validateProductSlugResponse(res, requestedSlug) {
  const body = safeJson(res);
  if (body === null) return false;

  const product = extractSingleProduct(body);
  if (!product || typeof product !== 'object') return false;
  if (!isValidProductShape(product)) return false;

  if (product.slug && String(product.slug) !== String(requestedSlug)) {
    return false;
  }

  return true;
}

function validateCategoryResponse(res, requestedCategorySlug, requestedLimit) {
  const body = safeJson(res);
  if (body === null) return false;

  const list = extractProductsArray(body);
  if (!Array.isArray(list)) return false;
  if (list.length === 0) return false;
  if (list.length > requestedLimit * 2) return false;

  for (const item of list) {
    if (!isValidProductShape(item)) return false;

    const categorySlug =
      item?.category?.slug ||
      item?.categorySlug ||
      item?.category_slug ||
      null;

    if (categorySlug !== null && String(categorySlug) !== String(requestedCategorySlug)) {
      return false;
    }
  }

  return true;
}

function validateSearchResponse(res, keyword, requestedLimit) {
  const body = safeJson(res);
  if (body === null) return false;

  const list = extractProductsArray(body);
  if (!Array.isArray(list)) return false;
  if (list.length > requestedLimit * 2) return false;

  for (const item of list) {
    if (!isValidProductShape(item)) return false;
  }

  if (list.length > 0) {
    const lowered = String(keyword).toLowerCase();
    const anyMatches = list.some((item) => {
      const haystacks = [
        item?.name,
        item?.slug,
        item?.description,
        item?.category?.name,
        item?.category?.slug,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return haystacks.some((v) => v.includes(lowered));
    });

    if (!anyMatches) return false;
  }

  return true;
}
//=================== Validation End ===================

// output
// Auto-writes files after run
export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'results/summary.json': JSON.stringify(data, null, 2),
    'results/summary.txt': textSummary(data),
  };
}

function textSummary(data) {
  const d = data.metrics.http_req_duration?.values || {};
  const f = data.metrics.http_req_failed?.values || {};
  const c = data.metrics.checks?.values || {};
  const r = data.metrics.http_reqs?.values || {};

  return [
    '=== PRODUCT/CATEGORY SOAK TEST SUMMARY ===',
    `http_req_duration avg: ${formatVal(d.avg)}`,
    `http_req_duration p90: ${formatVal(d['p(90)'])}`,
    `http_req_duration p95: ${formatVal(d['p(95)'])}`,
    `http_req_duration p99: ${formatVal(d['p(99)'])}`,
    `http_req_failed rate: ${formatPercent(f.rate)}`,
    `checks rate: ${formatPercent(c.rate)}`,
    `http_reqs count: ${formatVal(r.count)}`,
    `http_reqs rate: ${formatVal(r.rate)}/s`,
    '',
  ].join('\n');
}

function formatVal(v) {
  if (v === undefined || v === null) return 'N/A';
  return typeof v === 'number' ? v.toFixed(2) : String(v);
}

function formatPercent(v) {
  if (v === undefined || v === null) return 'N/A';
  return `${(Number(v) * 100).toFixed(2)}%`;
}


// JSON helpers
function safeJson(res) {
  try {
    return res.json();
  } catch (e) {
    return null;
  }
}

function looksLikeProductList(body) {
  return Array.isArray(extractProductsArray(body));
}

function looksLikeSingleProduct(body) {
  const p = extractSingleProduct(body);
  return !!p && typeof p === 'object';
}

function looksLikeCategoryListing(body) {
  return Array.isArray(extractProductsArray(body));
}

function looksLikeSearchResults(body) {
  return Array.isArray(extractProductsArray(body));
}

function extractProductsArray(body) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return null;

  return (
    body.products ||
    body.product ||
    body.results ||
    body.data?.products ||
    body.data?.result ||
    body.data ||
    body.items ||
    null
  );
}

function extractSingleProduct(body) {
  if (!body || typeof body !== 'object') return null;

  if (body.slug || body.name || body._id || body.id) return body;

  return body.product || body.data?.product || body.data || null;
}

function isValidProductShape(item) {
  if (!item || typeof item !== 'object') return false;

  return (
    item.id !== undefined ||
    item._id !== undefined ||
    item.slug !== undefined ||
    item.name !== undefined
  );
}

// Utils
function buildParams(endpoint, extraTags = {}) {
  return {
    timeout: '30s',
    headers: {
      Accept: 'application/json',
    },
    tags: {
      endpoint,
      ...extraTags,
    },
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * total;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.name;
  }

  return items[items.length - 1].name;
}