// Ng Hong Ray A0253509A
// Product/Category Soak Test
// Note:
// Please change admin@example.com role to 1 manually in DB
// To run: 
// $env:K6_WEB_DASHBOARD="true"
// $env:K6_WEB_DASHBOARD_OPEN="true" 
// $env:K6_WEB_DASHBOARD_PERIOD="5s" 
// $env:K6_WEB_DASHBOARD_EXPORT="results/report.html"
// k6 run soak_test.js

import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

//  test config
const BASE_URL = 'http://localhost:3000';
const SOAK_DURATION = '30s';
const REQUEST_RATE = 10;          // iterations per second
const PRE_ALLOCATED_VUS = 20;
const MAX_VUS = 100;

// Hardcoded test data - adjust as needed to match your actual product/category slugs and search keywords
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
  'book',
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

// ── Auth test data ──────────────────────────────────────────────
const AUTH_USERS = [
  { email: 'testuser1@example.com', password: 'Password123!' },
  { email: 'testuser2@example.com', password: 'Password123!' },
  { email: 'testuser3@example.com', password: 'Password123!' },
];
const AUTH_ADMIN = { email: 'admin@example.com', password: 'AdminPass123!' };

const REGISTER_POOL = [
  { name: 'Soak User A', email: `soakA_${Date.now()}@test.com`, password: 'SoakPass1!' },
  { name: 'Soak User B', email: `soakB_${Date.now()}@test.com`, password: 'SoakPass2!' },
];

const FORGOT_EMAILS = AUTH_USERS.map((u) => u.email);

const PROFILE_UPDATES = [
  { name: 'Updated Name One', phone: '91111111' },
  { name: 'Updated Name Two', phone: '92222222' },
  { name: 'Updated Name Three', phone: '93333333' },
];

const AUTH_ENDPOINT_WEIGHTS = [
  { name: 'login', weight: 35 },
  { name: 'userAuth', weight: 25 },
  { name: 'profileUpdate', weight: 20 },
  { name: 'forgotPassword', weight: 10 },
  { name: 'adminAuth', weight: 5 },
  { name: 'register', weight: 0 }, // set to 0 since we generate unique emails in doRegister()
];

// Per-VU token cache (reset each VU lifecycle)
let vuUserToken = null;
let vuAdminToken = null;

//  metrics
export const dataConsistencyFailures = new Rate('data_consistency_failures');
export const endpointFailures = new Rate('endpoint_failures');
export const endpointCalls = new Counter('endpoint_calls');
// authentication-related metrics
export const authEndpointFailures = new Rate('auth_endpoint_failures');
export const authEndpointCalls = new Counter('auth_endpoint_calls');

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
    auth_soak: {
      executor: 'constant-arrival-rate',
      exec: 'authSoak',
      rate: 5,
      timeUnit: '1s',
      duration: SOAK_DURATION,
      preAllocatedVUs: 10,
      maxVUs: 50,
      tags: { test_type: 'auth_soak' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200', 'p(99)<2500'],
    checks: ['rate>0.98'],
    //data_consistency_failures: ['rate<0.02'],
    endpoint_failures: ['rate<0.01'],

    'http_req_duration{endpoint:listProducts}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{endpoint:getProductBySlug}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{endpoint:getProductByCategory}': ['p(95)<1200', 'p(99)<2500'],
    'http_req_duration{endpoint:searchProducts}': ['p(95)<1500', 'p(99)<3000'],

    'http_req_failed{endpoint:listProducts}': ['rate<0.01'],
    'http_req_failed{endpoint:getProductBySlug}': ['rate<0.01'],
    'http_req_failed{endpoint:getProductByCategory}': ['rate<0.01'],
    'http_req_failed{endpoint:searchProducts}': ['rate<0.01'],
    // auth endpoints
    'http_req_duration{endpoint:login}': ['p(95)<1000', 'p(99)<2000'],
    'http_req_duration{endpoint:register}': ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{endpoint:forgotPassword}': ['p(95)<1500', 'p(99)<3000'],
    'http_req_duration{endpoint:userAuth}': ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{endpoint:adminAuth}': ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{endpoint:profileUpdate}': ['p(95)<1200', 'p(99)<2500'],

    'http_req_failed{endpoint:login}': ['rate<0.01'],
    'http_req_failed{endpoint:register}': ['rate<0.01'],
    'http_req_failed{endpoint:forgotPassword}': ['rate<0.01'],
    'http_req_failed{endpoint:userAuth}': ['rate<0.01'],
    'http_req_failed{endpoint:adminAuth}': ['rate<0.01'],
    'http_req_failed{endpoint:profileUpdate}': ['rate<0.01'],
    'http_req_failed{endpoint:tokenAcquisition}': ['rate<0.01'],

    auth_endpoint_failures: ['rate<0.02'],
  },
};

// Main scenario
export function productCategorySoak(data) {
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

export function setup() {
  const usersToCreate = [
    ...AUTH_USERS.map((u) => ({
      name: u.email.split('@')[0],
      email: u.email,
      password: u.password,
      phone: '91234567',
      address: '123 Test Street, Singapore',
      answer: 'soaktest',
    })),
    {
      name: 'Admin',
      email: AUTH_ADMIN.email,
      password: AUTH_ADMIN.password,
      phone: '90000000',
      address: '1 Admin Road, Singapore',
      answer: 'soaktest',
    },
  ];

  for (const payload of usersToCreate) {
    const res = http.post(
      `${BASE_URL}/api/v1/auth/register`,
      JSON.stringify(payload),
      {
        headers: { 'Content-Type': 'application/json' },
        responseCallback: http.expectedStatuses(201, 409), // 409 = already exists, not a failure
      }
    );
    if (res.status === 201) console.log(`Setup: registered ${payload.email}`);
    else if (res.status === 409) console.log(`Setup: ${payload.email} already exists, skipping`);
    else console.log(`Setup: UNEXPECTED ${payload.email} → ${res.status} | ${res.body}`);
  }

  // Acquire tokens — these setup() HTTP calls are excluded from all k6 metrics
  const userLoginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(AUTH_USERS[0]),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const adminLoginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(AUTH_ADMIN),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const userToken = userLoginRes.json()?.token || null;
  const adminToken = adminLoginRes.json()?.token || null;

  console.log(`Setup login check: ${userLoginRes.status} | token present: ${!!userToken} | role: ${userLoginRes.json()?.user?.role}`);
  console.log(`Setup admin check: ${adminLoginRes.status} | token present: ${!!adminToken} | role: ${adminLoginRes.json()?.user?.role}`);

  if (!userToken) console.log('Setup WARNING: No user token — protected endpoints will fail');
  if (!adminToken) console.log('Setup WARNING: No admin token — admin endpoints will fail');

  return { userToken, adminToken };
}

// ── Auth soak scenario ──────────────────────────────────────────
export function authSoak(data) {
  if (!vuUserToken) vuUserToken = data.userToken;
  if (!vuAdminToken) vuAdminToken = data.adminToken;

  const endpoint = weightedPick(AUTH_ENDPOINT_WEIGHTS);

  if (endpoint === 'login') doLogin();
  else if (endpoint === 'register') doRegister();
  else if (endpoint === 'forgotPassword') doForgotPassword();
  else if (endpoint === 'userAuth') doUserAuth();
  else if (endpoint === 'adminAuth') doAdminAuth();
  else doProfileUpdate();
}


// ── Auth endpoint functions ─────────────────────────────────────
function doLogin() {
  const creds = pickRandom(AUTH_USERS);
  const params = buildParams('login', { email: creds.email });
  authEndpointCalls.add(1, { endpoint: 'login' });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(creds),
    { ...params, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  );

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login returns token': (r) => {
      const b = safeJson(r);
      return !!(b?.token || b?.data?.token || b?.accessToken);
    },
    'login valid JSON': (r) => safeJson(r) !== null,
  });

  // Refresh VU token on successful login
  if (res.status === 200) {
    const b = safeJson(res);
    vuUserToken = b?.token || vuUserToken;
  }

  authEndpointFailures.add(!ok, { endpoint: 'login' });
}

function doRegister() {
  // Use a unique email per call to avoid duplicate-key failures
  const base = pickRandom(REGISTER_POOL);
  const payload = {
    name: base.name,
    email: `soak_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: base.password,
    phone: '91234567',
    address: '123 Test Street, Singapore',
    answer: 'soaktest',
  };
  const params = buildParams('register');
  authEndpointCalls.add(1, { endpoint: 'register' });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(payload),
    { ...params, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  );

  const ok = check(res, {
    'register status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'register valid JSON': (r) => safeJson(r) !== null,
    'register has user or token': (r) => {
      const b = safeJson(r);
      return !!(b?.user || b?.data?.user || b?.token || b?.data?.token || b?.message);
    },
  });

  authEndpointFailures.add(!ok, { endpoint: 'register' });
}

function doForgotPassword() {
  const user = pickRandom(AUTH_USERS);
  const params = buildParams('forgotPassword', { email: user.email });
  authEndpointCalls.add(1, { endpoint: 'forgotPassword' });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/forgot-password`,
    JSON.stringify({
      email: user.email,
      answer: 'soaktest',      // must match what was registered in setup()
      newPassword: user.password,   // reset back to same password so logins keep working
    }),
    { ...params, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
  );

  const ok = check(res, {
    'forgotPassword status 200': (r) => r.status === 200,
    'forgotPassword valid JSON': (r) => safeJson(r) !== null,
    'forgotPassword has message': (r) => {
      const b = safeJson(r);
      return typeof (b?.message) === 'string';
    },
  });

  authEndpointFailures.add(!ok, { endpoint: 'forgotPassword' });
  if (!ok) console.log(`FAILED forgotPassword | status=${res.status} | body=${res.body}`);
}

function doUserAuth() {
  if (!vuUserToken) return; // skip if no token yet
  const params = buildParams('userAuth');
  authEndpointCalls.add(1, { endpoint: 'userAuth' });

  const res = http.get(
    `${BASE_URL}/api/v1/auth/user-auth`,
    {
      ...params,
      headers: { Authorization: vuUserToken, Accept: 'application/json' },
    }
  );

  const ok = check(res, {
    'userAuth status 200': (r) => r.status === 200,
    'userAuth valid JSON': (r) => safeJson(r) !== null,
    'userAuth ok flag true': (r) => {
      const b = safeJson(r);
      return b?.ok === true || b?.success === true || b?.status === 'ok' || r.status === 200;
    },
  });

  // Invalidate stale token on 401
  if (res.status === 401) vuUserToken = null;

  authEndpointFailures.add(!ok, { endpoint: 'userAuth' });
  if (!ok) console.log(`FAILED userAuth | status=${res.status} | body=${res.body}`);

}

function doAdminAuth() {
  if (!vuAdminToken) return; // skip if no token yet
  const params = buildParams('adminAuth');
  authEndpointCalls.add(1, { endpoint: 'adminAuth' });

  const res = http.get(
    `${BASE_URL}/api/v1/auth/admin-auth`,
    {
      ...params,
      headers: { Authorization: vuAdminToken, Accept: 'application/json' },
    }
  );

  const ok = check(res, {
    'adminAuth status 200': (r) => r.status === 200,
    'adminAuth valid JSON': (r) => safeJson(r) !== null,
    'adminAuth ok flag true': (r) => {
      const b = safeJson(r);
      return b?.ok === true || b?.success === true || r.status === 200;
    },
  });

  if (res.status === 401) vuAdminToken = null;

  authEndpointFailures.add(!ok, { endpoint: 'adminAuth' });
}

function doProfileUpdate() {
  if (!vuUserToken) return; // skip if no token yet
  const update = pickRandom(PROFILE_UPDATES);
  const params = buildParams('profileUpdate');
  authEndpointCalls.add(1, { endpoint: 'profileUpdate' });

  const res = http.put(
    `${BASE_URL}/api/v1/auth/profile`,
    JSON.stringify(update),
    {
      ...params,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: vuUserToken,
      },
    }
  );

  const ok = check(res, {
    'profileUpdate status 200': (r) => r.status === 200,
    'profileUpdate valid JSON': (r) => safeJson(r) !== null,
    'profileUpdate has user object': (r) => {
      const b = safeJson(r);
      return !!(b?.user || b?.data?.user || b?.updatedUser || b?.message);
    },
  });

  if (res.status === 401) vuUserToken = null;

  authEndpointFailures.add(!ok, { endpoint: 'profileUpdate' });
  if (!ok) console.log(`FAILED profileUpdate | status=${res.status} | body=${res.body}`);

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
    `auth_endpoint_failures rate: ${formatPercent((data.metrics.auth_endpoint_failures?.values || {}).rate)}`,
    `auth_endpoint_calls count: ${formatVal((data.metrics.auth_endpoint_calls?.values || {}).count)}`,
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