// Liu Yiyang, A0258121M

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060/api/v1";
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || "";
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || "";
const PAYMENT_NONCE = __ENV.PAYMENT_NONCE || "fake-valid-nonce";
const CART_PRODUCT_ID = __ENV.CART_PRODUCT_ID || "64b7f0aa12ab34cd56ef7890";
const CART_ITEM_PRICE = Number(__ENV.CART_ITEM_PRICE || "9.99");

const loginLatency = new Trend("login_latency");
const userAuthLatency = new Trend("user_auth_latency");
const braintreeTokenLatency = new Trend("braintree_token_latency");
const braintreePaymentLatency = new Trend("braintree_payment_latency");
const successRate = new Rate("success_rate");

const rampUp = __ENV.RAMP_UP || "1m";
const steady = __ENV.STEADY || "5m";
const rampDown = __ENV.RAMP_DOWN || "30s";
const targetVus = Number(__ENV.TARGET_VUS || "100");

export const options = {
  tags: {
    test_name: "returning_customer",
  },
  stages: [
    { duration: rampUp, target: targetVus },
    { duration: steady, target: targetVus },
    { duration: rampDown, target: 0 },
  ],
  thresholds: {
    login_latency: ["p(95)<1000"],
    user_auth_latency: ["p(95)<1000"],
    braintree_token_latency: ["p(95)<1000"],
    braintree_payment_latency: ["p(95)<1000"],
    http_req_duration: ["p(99)<2500"],
    success_rate: ["rate>=0.99"],
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
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    throw new Error(
      "Missing LOGIN_EMAIL or LOGIN_PASSWORD environment variable",
    );
  }

  let authToken = "";

  group("1. Login", () => {
    const payload = JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });

    const response = http.post(`${BASE_URL}/auth/login`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_login" },
    });

    const body = parseJson(response);

    const ok = recordResult(response, loginLatency, {
      "login status is 200": (r) => r.status === 200,
      "login has token": () => Boolean(body?.token),
    });

    if (ok) {
      authToken = body.token;
    }
  });

  if (!authToken) {
    sleep(1);
    return;
  }

  group("2. Validate Session", () => {
    const response = http.get(`${BASE_URL}/auth/user-auth`, {
      headers: { Authorization: authToken },
      tags: { endpoint: "auth_user_auth" },
    });

    const body = parseJson(response);

    recordResult(response, userAuthLatency, {
      "user-auth status is 200": (r) => r.status === 200,
      "user-auth ok:true": () => body?.ok === true,
    });
  });

  group("3. Get Braintree Client Token", () => {
    const response = http.get(`${BASE_URL}/product/braintree/token`, {
      tags: { endpoint: "product_braintree_token" },
    });

    const body = parseJson(response);

    recordResult(response, braintreeTokenLatency, {
      "braintree token status is 200": (r) => r.status === 200,
      "braintree token present": () => Boolean(body?.clientToken),
    });
  });

  group("4. Submit Payment", () => {
    const cart = [
      {
        _id: CART_PRODUCT_ID,
        price: CART_ITEM_PRICE,
      },
    ];

    const paymentPayload = JSON.stringify({
      nonce: PAYMENT_NONCE,
      cart,
      orderId: `k6-${__VU}-${Date.now()}`,
    });

    const response = http.post(
      `${BASE_URL}/product/braintree/payment`,
      paymentPayload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        tags: { endpoint: "product_braintree_payment" },
      },
    );

    const body = parseJson(response);

    recordResult(response, braintreePaymentLatency, {
      "payment status is 200": (r) => r.status === 200,
      "payment ok:true": () => body?.ok === true,
    });
  });

  sleep(1);
}
