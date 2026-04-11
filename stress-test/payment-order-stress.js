// Dong Cheng-Yu A0262348B
//
// Tested endpoints:
// - GET /api/v1/product/get-product,
// - GET /api/v1/product/braintree/token,
// - POST /api/v1/product/braintree/payment,
// - GET /api/v1/auth/orders,
// - PUT /api/v1/auth/order-status/:orderId
// Example usage (no .sh):
// - From repo root: mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/payment-order-stress.js --env BASE_URL=http://localhost:6060 --env REUSE_USERS=true --env USER_POOL_FILE=./stress-test/auth-user-pool.generated.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env PAYMENT_P95_ABORT_MS=999999 --env ORDERS_P95_ABORT_MS=999999 --env STATUS_P95_ABORT_MS=999999 --summary-export ./stress-test/results/payment-order-stress-summary.json
// - From stress-test/: mkdir -p ./results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./payment-order-stress.js --env BASE_URL=http://localhost:6060 --env REUSE_USERS=true --env USER_POOL_FILE=./auth-user-pool.generated.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env PAYMENT_P95_ABORT_MS=999999 --env ORDERS_P95_ABORT_MS=999999 --env STATUS_P95_ABORT_MS=999999 --summary-export ./results/payment-order-stress-summary.json
import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const PAYMENT_NONCE = __ENV.PAYMENT_NONCE || 'fake-valid-nonce';

const REUSE_USERS = (
  (__ENV.REUSE_USERS || (__ENV.USER_POOL_FILE ? 'true' : 'false')).toLowerCase() === 'true'
);
const USER_POOL_FILE = __ENV.USER_POOL_FILE || '';

const START_RATE = Number(__ENV.START_RATE || __ENV.BASELINE_RATE || 20); 
const RATE_STEP = Number(__ENV.RATE_STEP || __ENV.STEP_RATE || 20);
const STEP_DURATION_SEC = Number(__ENV.STEP_DURATION_SEC || 10);
// Safety fuse only. Real stop condition should be abort-on-fail thresholds below.
const MAX_STEPS = Number(__ENV.MAX_STEPS || 59);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 100);
const MAX_VUS = Number(__ENV.MAX_VUS || 2500);
const FAIL_RATE_ABORT = Number(__ENV.FAIL_RATE_ABORT || 0.05);
const PAYMENT_P95_ABORT_MS = Number(__ENV.PAYMENT_P95_ABORT_MS || 5000);
const ORDERS_P95_ABORT_MS = Number(__ENV.ORDERS_P95_ABORT_MS || 3000);
const STATUS_P95_ABORT_MS = Number(__ENV.STATUS_P95_ABORT_MS || 3000);
const ABORT_EVAL_DELAY_SEC = Number(__ENV.ABORT_EVAL_DELAY_SEC || 30);

const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || '';
const HAS_ADMIN_CREDS = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

const homepageLatency = new Trend('payment_homepage_latency_ms');
const registerLatency = new Trend('payment_register_latency_ms');
const loginLatency = new Trend('payment_login_latency_ms');
const tokenLatency = new Trend('payment_braintree_token_latency_ms');
const paymentLatency = new Trend('payment_braintree_payment_latency_ms');
const ordersLatency = new Trend('payment_orders_latency_ms');
const statusLatency = new Trend('payment_order_status_latency_ms');

const homepageSuccessRate = new Rate('payment_homepage_success_rate');
const registerSuccessRate = new Rate('payment_register_success_rate');
const loginSuccessRate = new Rate('payment_login_success_rate');
const tokenSuccessRate = new Rate('payment_braintree_token_success_rate');
const paymentSuccessRate = new Rate('payment_braintree_payment_success_rate');
const ordersSuccessRate = new Rate('payment_orders_success_rate');
const statusSuccessRate = new Rate('payment_order_status_success_rate');
const orderIdResolvedRate = new Rate('payment_order_id_resolved_rate');
const checkoutJourneySuccessRate = new Rate('payment_checkout_journey_success_rate');
const paymentTargetRateRps = new Trend('payment_target_rate_rps');

let adminToken = '';

function parseCsv(csv) {
  return csv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name = '', email = '', password = '', phone = '', address = '', answer = ''] = line
        .split(',')
        .map((value) => value.trim());
      return { name, email, password, phone, address, answer };
    })
    .filter((user) => user.email && user.password);
}

function loadUserPool() {
  if (!USER_POOL_FILE) {
    return [];
  }

  const candidates = [
    USER_POOL_FILE,
    USER_POOL_FILE.replace('./stress-test/', './'),
    USER_POOL_FILE.replace('stress-test/', './'),
    USER_POOL_FILE.replace('./performance/k6/', './'),
    USER_POOL_FILE.replace('performance/k6/', './'),
  ];

  for (const candidate of candidates) {
    try {
      return parseCsv(open(candidate));
    } catch (error) {
      // try next candidate
    }
  }

  throw new Error(`Unable to open USER_POOL_FILE. Tried: ${candidates.join(', ')}`);
}

const userPool = REUSE_USERS ? new SharedArray('payment-user-pool', loadUserPool) : [];

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
    payment_order_stress: {
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
    payment_homepage_success_rate: ['rate>0.85'],
    payment_braintree_token_success_rate: ['rate>0.85'],
    payment_braintree_payment_success_rate: ['rate>0.75'],
    payment_orders_success_rate: ['rate>0.80'],
    payment_order_status_success_rate: ['rate>0.75'],
    payment_checkout_journey_success_rate: ['rate>0.70'],
    payment_homepage_latency_ms: ['p(95)<3000'],
    payment_braintree_token_latency_ms: ['p(95)<3000'],
    payment_braintree_payment_latency_ms: [
      {
        threshold: `p(95)<${PAYMENT_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    payment_orders_latency_ms: [
      {
        threshold: `p(95)<${ORDERS_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    payment_order_status_latency_ms: [
      {
        threshold: `p(95)<${STATUS_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function uniqueUser() {
  const id = `${Date.now()}-${__VU}-${__ITER}`;
  return {
    name: `k6-pay-${id}`,
    email: `k6-pay-${id}@test.local`,
    password: 'P@ssword123!',
    phone: `9${String(2000000 + (__ITER % 7999999)).padStart(7, '0')}`,
    address: `Checkout Load Address ${id}`,
    answer: 'blue',
  };
}

function pickUser() {
  if (REUSE_USERS) {
    if (userPool.length === 0) {
      throw new Error('REUSE_USERS=true but USER_POOL_FILE is empty or unreadable');
    }

    return userPool[(__VU + __ITER) % userPool.length];
  }

  return uniqueUser();
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildOrderId() {
  return `k6-order-${Date.now()}-${__VU}-${__ITER}-${Math.floor(Math.random() * 1000000)}`;
}

function getAdminToken() {
  if (!HAS_ADMIN_CREDS) {
    return '';
  }

  if (adminToken) {
    return adminToken;
  }

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    {
      tags: { endpoint: 'admin-login' },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: '20s',
    }
  );

  try {
    adminToken = loginRes.json('token') || '';
  } catch (error) {
    adminToken = '';
  }

  return adminToken;
}

export default function () {
  const user = pickUser();
  const startedAt = Date.now();
  paymentTargetRateRps.add(currentTargetRate());

  let homepageOk = false;
  let tokenOk = false;
  let paymentOk = false;
  let ordersOk = false;
  let statusOk = true;
  let orderId = '';

  group('checkout-journey', function () {
    const homepageRes = http.get(`${BASE_URL}/api/v1/product/get-product`, {
      tags: { endpoint: 'homepage-products' },
      headers: { Accept: 'application/json' },
      timeout: '20s',
    });

    homepageLatency.add(homepageRes.timings.duration);
    homepageOk = check(homepageRes, {
      'homepage product list status is 200': (r) => r.status === 200,
    });
    homepageSuccessRate.add(homepageOk);

    let products = [];
    if (homepageOk) {
      try {
        const payload = homepageRes.json();
        if (payload?.products && Array.isArray(payload.products)) {
          products = payload.products;
        }
      } catch (error) {
        products = [];
      }
    }

    if (products.length === 0) {
      return;
    }

    const selectedProduct = pickRandom(products);
    const cartItem = {
      _id: selectedProduct._id,
      name: selectedProduct.name,
      slug: selectedProduct.slug,
      price: selectedProduct.price,
      category: selectedProduct.category?._id || selectedProduct.category,
      quantity: 1,
    };

    // This endpoint only generates a client token; it does not charge a card.
    const tokenRes = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
      tags: { endpoint: 'braintree-token' },
      headers: { Accept: 'application/json' },
      timeout: '20s',
    });

    tokenLatency.add(tokenRes.timings.duration);
    tokenOk = check(tokenRes, {
      'braintree token status is 200': (r) => r.status === 200,
    });
    tokenSuccessRate.add(tokenOk);

    let registerOk = true;
    if (!REUSE_USERS) {
      const registerRes = http.post(
        `${BASE_URL}/api/v1/auth/register`,
        JSON.stringify(user),
        {
          tags: { endpoint: 'auth-register' },
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: '20s',
        }
      );

      registerLatency.add(registerRes.timings.duration);
      registerOk = check(registerRes, {
        'register status is 201': (r) => r.status === 201,
      });
      registerSuccessRate.add(registerOk);
    }

    // We do not need register/login endpoints in the target list, but the payment
    // and order endpoints require authentication, so this keeps the flow realistic.
    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      {
        tags: { endpoint: 'auth-login' },
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: '20s',
      }
    );

    loginLatency.add(loginRes.timings.duration);
    const loginOk = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
    });
    loginSuccessRate.add(loginOk);

    let userToken = '';
    try {
      userToken = loginRes.json('token') || '';
    } catch (error) {
      userToken = '';
    }

    if (!registerOk || !loginOk || !userToken) {
      return;
    }

    const paymentRes = http.post(
      `${BASE_URL}/api/v1/product/braintree/payment`,
      JSON.stringify({
        nonce: PAYMENT_NONCE,
        cart: [cartItem],
        orderId: buildOrderId(),
      }),
      {
        tags: { endpoint: 'braintree-payment' },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: userToken,
        },
        timeout: '30s',
      }
    );

    paymentLatency.add(paymentRes.timings.duration);
    paymentOk = check(paymentRes, {
      'payment status is 200': (r) => r.status === 200,
    });
    paymentSuccessRate.add(paymentOk);

    const ordersRes = http.get(`${BASE_URL}/api/v1/auth/orders`, {
      tags: { endpoint: 'auth-orders' },
      headers: { Accept: 'application/json', Authorization: userToken },
      timeout: '20s',
    });

    ordersLatency.add(ordersRes.timings.duration);
    ordersOk = check(ordersRes, {
      'orders status is 200': (r) => r.status === 200,
    });
    ordersSuccessRate.add(ordersOk);

    try {
      const orders = ordersRes.json();
      if (Array.isArray(orders) && orders.length > 0) {
        orderId = orders[0]?._id || '';
      }
    } catch (error) {
      orderId = '';
    }

    orderIdResolvedRate.add(Boolean(orderId));

    if (HAS_ADMIN_CREDS && orderId) {
      const adminTokenValue = getAdminToken();
      if (adminTokenValue) {
        const statusRes = http.put(
          `${BASE_URL}/api/v1/auth/order-status/${orderId}`,
          JSON.stringify({ status: 'Processing' }),
          {
            tags: { endpoint: 'order-status' },
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: adminTokenValue,
            },
            timeout: '20s',
          }
        );

        statusLatency.add(statusRes.timings.duration);
        statusOk = check(statusRes, {
          'order-status update is 200': (r) => r.status === 200,
        });
        statusSuccessRate.add(statusOk);
      } else {
        statusOk = false;
        statusSuccessRate.add(false);
      }
    }
  });

  checkoutJourneySuccessRate.add(homepageOk && tokenOk && paymentOk && ordersOk && statusOk);
}
