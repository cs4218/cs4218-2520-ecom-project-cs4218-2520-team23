// Liu Yiyang, A0258121M

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060/api/v1";
const DEFAULT_PASSWORD = __ENV.NEW_USER_PASSWORD || "TestPass123!";

const registerLatency = new Trend("new_customer_register_latency");
const loginLatency = new Trend("new_customer_login_latency");
const successRate = new Rate("new_customer_success_rate");

const rampUp = __ENV.RAMP_UP || "1m";
const steady = __ENV.STEADY || "5m";
const rampDown = __ENV.RAMP_DOWN || "30s";
const targetVus = Number(__ENV.TARGET_VUS || "100");

export const options = {
  tags: {
    test_name: "new_customer_register_login",
  },
  stages: [
    { duration: rampUp, target: targetVus },
    { duration: steady, target: targetVus },
    { duration: rampDown, target: 0 },
  ],
  thresholds: {
    new_customer_register_latency: ["p(95)<1200"],
    new_customer_login_latency: ["p(95)<1200"],
    http_req_duration: ["p(99)<3000"],
    new_customer_success_rate: ["rate>=0.99"],
    http_req_failed: ["rate<0.01"],
  },
};

function parseJson(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

function recordResult(response, trendMetric, assertions) {
  const ok = check(response, assertions);
  successRate.add(ok);
  if (ok) {
    trendMetric.add(response.timings.duration);
  }
  return ok;
}

export default function () {
  const uniqueSeed = `${Date.now()}-${__VU}-${__ITER}`;
  const email = `k6-new-${uniqueSeed}@example.com`;
  const password = DEFAULT_PASSWORD;

  group("1. Register", () => {
    const payload = JSON.stringify({
      name: `k6-user-${uniqueSeed}`,
      email,
      password,
      phone: "90000000",
      address: "k6-load-test-address",
      answer: "blue",
    });

    const response = http.post(`${BASE_URL}/auth/register`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_register" },
    });

    const body = parseJson(response);

    recordResult(response, registerLatency, {
      "register status is 201": (r) => r.status === 201,
      "register success true": () => body?.success === true,
    });
  });

  group("2. Login", () => {
    const payload = JSON.stringify({ email, password });

    const response = http.post(`${BASE_URL}/auth/login`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_login" },
    });

    const body = parseJson(response);

    recordResult(response, loginLatency, {
      "login status is 200": (r) => r.status === 200,
      "login has token": () => Boolean(body?.token),
    });
  });

  sleep(1);
}
