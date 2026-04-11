// Liu Yiyang, A0258121M

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060/api/v1";
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "";
const PRODUCT_PRICE = __ENV.PRODUCT_PRICE || "49.99";
const PRODUCT_QUANTITY = __ENV.PRODUCT_QUANTITY || "25";
const PRODUCT_SHIPPING = __ENV.PRODUCT_SHIPPING || "1";

const productPhotoBin = open("./fixtures/product-photo.jpg", "b");

const adminLoginLatency = new Trend("admin_product_login_latency");
const adminAuthLatency = new Trend("admin_product_admin_auth_latency");
const categoryFetchLatency = new Trend("admin_product_category_latency");
const createProductLatency = new Trend("admin_product_create_latency");
const successRate = new Rate("admin_product_success_rate");

const rampUp = __ENV.RAMP_UP || "1m";
const steady = __ENV.STEADY || "5m";
const rampDown = __ENV.RAMP_DOWN || "30s";
const targetVus = Number(__ENV.TARGET_VUS || "100");

export const options = {
  tags: {
    test_name: "admin_create_product",
  },
  stages: [
    { duration: rampUp, target: targetVus },
    { duration: steady, target: targetVus },
    { duration: rampDown, target: 0 },
  ],
  thresholds: {
    admin_product_login_latency: ["p(95)<900"],
    admin_product_admin_auth_latency: ["p(95)<900"],
    admin_product_category_latency: ["p(95)<900"],
    admin_product_create_latency: ["p(95)<900"],
    http_req_duration: ["p(99)<2500"],
    admin_product_success_rate: ["rate>=0.99"],
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
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variable",
    );
  }

  let authToken = "";
  let categoryId = "";

  group("1. Admin Login", () => {
    const payload = JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const response = http.post(`${BASE_URL}/auth/login`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_login" },
    });

    const body = parseJson(response);

    const ok = recordResult(response, adminLoginLatency, {
      "admin login status is 200": (r) => r.status === 200,
      "admin login has token": () => Boolean(body?.token),
      "admin login role is admin": () => body?.user?.role === 1,
    });

    if (ok) {
      authToken = body.token;
    }
  });

  if (!authToken) {
    sleep(1);
    return;
  }

  group("2. Admin Auth", () => {
    const response = http.get(`${BASE_URL}/auth/admin-auth`, {
      headers: { Authorization: authToken },
      tags: { endpoint: "auth_admin_auth" },
    });

    const body = parseJson(response);

    recordResult(response, adminAuthLatency, {
      "admin-auth status is 200": (r) => r.status === 200,
      "admin-auth ok:true": () => body?.ok === true,
    });
  });

  group("3. Get Categories", () => {
    const response = http.get(`${BASE_URL}/category/get-category`, {
      tags: { endpoint: "category_get_category" },
    });

    const body = parseJson(response);
    const categories = Array.isArray(body?.category) ? body.category : [];

    const ok = recordResult(response, categoryFetchLatency, {
      "category fetch status is 200": (r) => r.status === 200,
      "category list is non-empty": () => categories.length > 0,
    });

    if (ok) {
      categoryId = categories[0]._id;
    }
  });

  if (!categoryId) {
    sleep(1);
    return;
  }

  group("4. Create Product", () => {
    const uniqueSeed = `${Date.now()}-${__VU}-${__ITER}`;

    const payload = {
      name: `k6-admin-product-${uniqueSeed}`,
      description: `k6 generated product ${uniqueSeed}`,
      price: PRODUCT_PRICE,
      category: categoryId,
      quantity: PRODUCT_QUANTITY,
      shipping: PRODUCT_SHIPPING,
      photo: http.file(
        productPhotoBin,
        `k6-photo-${uniqueSeed}.jpg`,
        "image/jpeg",
      ),
    };

    const response = http.post(`${BASE_URL}/product/create-product`, payload, {
      headers: {
        Authorization: authToken,
      },
      tags: { endpoint: "product_create_product" },
    });

    const body = parseJson(response);

    recordResult(response, createProductLatency, {
      "create product status is 201": (r) => r.status === 201,
      "create product success true": () => body?.success === true,
    });
  });

  sleep(1);
}
