// Dong Cheng-Yu A0262348B
//
// Tested endpoints:
// - POST /api/v1/auth/register,
// - POST /api/v1/auth/login,
// - GET /api/v1/auth/user-auth,
// - GET /api/v1/auth/admin-auth,
// - PUT /api/v1/auth/profile
// Example usage (no .sh):
// - From repo root: mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/auth-stress.js --env BASE_URL=http://localhost:6060 --env REUSE_USERS=true --env USER_POOL_FILE=./stress-test/auth-user-pool.generated.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env LOGIN_P95_ABORT_MS=999999 --env USER_AUTH_P95_ABORT_MS=999999 --env PROFILE_P95_ABORT_MS=999999 --summary-export ./stress-test/results/auth-stress-summary.json
// - From stress-test/: mkdir -p ./results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./auth-stress.js --env BASE_URL=http://localhost:6060 --env REUSE_USERS=true --env USER_POOL_FILE=./auth-user-pool.generated.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env LOGIN_P95_ABORT_MS=999999 --env USER_AUTH_P95_ABORT_MS=999999 --env PROFILE_P95_ABORT_MS=999999 --summary-export ./results/auth-stress-summary.json
import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

const REUSE_USERS = (
  (__ENV.REUSE_USERS || (__ENV.USER_POOL_FILE ? 'true' : 'false')).toLowerCase() === 'true'
);
const USER_POOL_FILE = __ENV.USER_POOL_FILE || '';

const START_RATE = Number(__ENV.START_RATE || __ENV.BASELINE_RATE || 20);
const RATE_STEP = Number(__ENV.RATE_STEP || __ENV.STEP_RATE || 20);
const STEP_DURATION_SEC = Number(__ENV.STEP_DURATION_SEC || 10);
// Safety fuse only. Real stop condition should be abort-on-fail thresholds below.
const MAX_STEPS = Number(__ENV.MAX_STEPS || 59);
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS || 200);
const MAX_VUS = Number(__ENV.MAX_VUS || 2500);
const FAIL_RATE_ABORT = Number(__ENV.FAIL_RATE_ABORT || 0.05);
const LOGIN_P95_ABORT_MS = Number(__ENV.LOGIN_P95_ABORT_MS || 3000);
const USER_AUTH_P95_ABORT_MS = Number(__ENV.USER_AUTH_P95_ABORT_MS || 3000);
const PROFILE_P95_ABORT_MS = Number(__ENV.PROFILE_P95_ABORT_MS || 3000);
const ABORT_EVAL_DELAY_SEC = Number(__ENV.ABORT_EVAL_DELAY_SEC || 30);

const ADMIN_RATE = Number(__ENV.ADMIN_RATE || 5);
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || '';
const HAS_ADMIN_CREDS = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

const registerLatency = new Trend('auth_register_latency_ms');
const loginLatency = new Trend('auth_login_latency_ms');
const userAuthLatency = new Trend('auth_user_auth_latency_ms');
const adminAuthLatency = new Trend('auth_admin_auth_latency_ms');
const profileLatency = new Trend('auth_profile_latency_ms');

const registerSuccessRate = new Rate('auth_register_success_rate');
const loginSuccessRate = new Rate('auth_login_success_rate');
const loginHttp200Rate = new Rate('auth_login_http_200_rate');
const loginHttp401Rate = new Rate('auth_login_http_401_rate');
const loginInvalidCredentialsRate = new Rate('auth_login_invalid_credentials_rate');
const userAuthSuccessRate = new Rate('auth_user_auth_success_rate');
const adminAuthSuccessRate = new Rate('auth_admin_auth_success_rate');
const profileSuccessRate = new Rate('auth_profile_success_rate');
const tokenAcquiredRate = new Rate('auth_token_acquired_rate');
const userJourneySuccessRate = new Rate('auth_user_journey_success_rate');
const targetRateRps = new Trend('auth_target_rate_rps');

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

const userPool = REUSE_USERS ? new SharedArray('auth-user-pool', loadUserPool) : [];

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

function totalDurationSec(stages) {
  return stages.reduce((acc, stage) => acc + Number(String(stage.duration).replace('s', '')), 0);
}

function buildScenarios(stages) {
  const scenarios = {
    auth_user_journey: {
      executor: 'ramping-arrival-rate',
      exec: 'userJourney',
      startRate: START_RATE,
      timeUnit: '1s',
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
      stages,
    },
  };

  if (HAS_ADMIN_CREDS) {
    scenarios.auth_admin_validation = {
      executor: 'constant-arrival-rate',
      exec: 'adminValidation',
      rate: ADMIN_RATE,
      timeUnit: '1s',
      duration: `${totalDurationSec(stages)}s`,
      preAllocatedVUs: Math.max(20, Math.ceil(ADMIN_RATE * 3)),
      maxVUs: Math.max(200, Math.ceil(ADMIN_RATE * 20)),
    };
  }

  return scenarios;
}

function buildThresholds() {
  const thresholds = {
    http_req_failed: [
      {
        threshold: `rate<${FAIL_RATE_ABORT}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    auth_login_success_rate: ['rate>0.85'],
    auth_user_auth_success_rate: ['rate>0.85'],
    auth_profile_success_rate: ['rate>0.80'],
    auth_token_acquired_rate: ['rate>0.85'],
    auth_user_journey_success_rate: ['rate>0.75'],
    auth_login_latency_ms: [
      {
        threshold: `p(95)<${LOGIN_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    auth_user_auth_latency_ms: [
      {
        threshold: `p(95)<${USER_AUTH_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
    auth_profile_latency_ms: [
      {
        threshold: `p(95)<${PROFILE_P95_ABORT_MS}`,
        abortOnFail: true,
        delayAbortEval: `${ABORT_EVAL_DELAY_SEC}s`,
      },
    ],
  };

  if (!REUSE_USERS) {
    thresholds.auth_register_success_rate = ['rate>0.80'];
    thresholds.auth_register_latency_ms = ['p(95)<3000'];
  }

  if (HAS_ADMIN_CREDS) {
    thresholds.auth_admin_auth_success_rate = ['rate>0.85'];
    thresholds.auth_admin_auth_latency_ms = ['p(95)<3000'];
  }

  return thresholds;
}

export const options = {
  scenarios: buildScenarios(stages),
  thresholds: buildThresholds(),
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

function uniqueUser() {
  const id = `${Date.now()}-${__VU}-${__ITER}`;
  return {
    name: `k6-user-${id}`,
    email: `k6-user-${id}@test.local`,
    password: 'P@ssword123!',
    phone: `9${String(1000000 + (__ITER % 8999999)).padStart(7, '0')}`,
    address: `Load Test Address ${id}`,
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

export function userJourney() {
  const user = pickUser();
  targetRateRps.add(currentTargetRate());

  let registerOk = false;
  let loginOk = false;
  let tokenOk = false;
  let userAuthOk = false;
  let profileOk = false;

  let token = '';

  group('auth-user-journey', function () {
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
    } else {
      registerOk = true;
    }

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
    loginOk = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
    });
    loginSuccessRate.add(loginOk);
    loginHttp200Rate.add(loginRes.status === 200);
    loginHttp401Rate.add(loginRes.status === 401);

    const loginBody = String(loginRes.body || '').toLowerCase();
    const invalidCredentials =
      loginRes.status === 401 &&
      /(invalid|incorrect|wrong|password|email|credential|not found)/.test(loginBody);
    loginInvalidCredentialsRate.add(invalidCredentials);

    try {
      token = loginRes.json('token') || '';
    } catch (error) {
      token = '';
    }

    tokenOk = token.length > 0;
    tokenAcquiredRate.add(tokenOk);

    if (!tokenOk) {
      return;
    }

    // This backend expects raw JWT string in Authorization header.
    const userAuthRes = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
      tags: { endpoint: 'auth-user-auth' },
      headers: { Accept: 'application/json', Authorization: token },
      timeout: '20s',
    });

    userAuthLatency.add(userAuthRes.timings.duration);
    userAuthOk = check(userAuthRes, {
      'user-auth status is 200': (r) => r.status === 200,
    });
    userAuthSuccessRate.add(userAuthOk);

    const profileRes = http.put(
      `${BASE_URL}/api/v1/auth/profile`,
      JSON.stringify({
        name: `${user.name}-updated`,
        phone: user.phone,
        address: `${user.address} (updated)`,
      }),
      {
        tags: { endpoint: 'auth-profile' },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
        },
        timeout: '20s',
      }
    );

    profileLatency.add(profileRes.timings.duration);
    profileOk = check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
    });
    profileSuccessRate.add(profileOk);
  });

  userJourneySuccessRate.add(registerOk && loginOk && tokenOk && userAuthOk && profileOk);
}

export function adminValidation() {
  if (!HAS_ADMIN_CREDS) {
    return;
  }

  let token = '';

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    {
      tags: { endpoint: 'auth-admin-login' },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: '20s',
    }
  );

  loginLatency.add(loginRes.timings.duration);

  try {
    token = loginRes.json('token') || '';
  } catch (error) {
    token = '';
  }

  if (!token) {
    adminAuthSuccessRate.add(false);
    return;
  }

  const adminAuthRes = http.get(`${BASE_URL}/api/v1/auth/admin-auth`, {
    tags: { endpoint: 'auth-admin-auth' },
    headers: { Accept: 'application/json', Authorization: token },
    timeout: '20s',
  });

  adminAuthLatency.add(adminAuthRes.timings.duration);
  const adminOk = check(adminAuthRes, {
    'admin-auth status is 200': (r) => r.status === 200,
  });
  adminAuthSuccessRate.add(adminOk);
}
