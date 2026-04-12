// Liu Yiyang, A0258121M

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";

const categoryLatency = new Trend("p95_category_latency");
const productListLatency = new Trend("p95_product_list_latency");
const productDetailLatency = new Trend("p95_product_detail_latency");
const productSearchLatency = new Trend("p95_product_search_latency");
const relatedProductLatency = new Trend("p95_related_product_latency");
const productPhotoLatency = new Trend("p95_product_photo_latency");

const successRate = new Rate("success_rate");

export const options = {
  tags: {
    test_name: "window_shopper",
  },

  stages: [
    { duration: "1m", target: 100 },
    { duration: "5m", target: 100 },
    { duration: "30s", target: 0 },
  ],

  thresholds: {
    p95_category_latency: ["p(95)<900"],
    p95_product_list_latency: ["p(95)<900"],
    p95_product_detail_latency: ["p(95)<900"],
    p95_product_search_latency: ["p(95)<900"],
    p95_related_product_latency: ["p(95)<900"],
    p95_product_photo_latency: ["p(95)<900"],

    http_req_duration: ["p(99)<2500"],

    success_rate: ["rate>=0.99"],

    "http_req_failed{scenario:default}": ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060/api/v1";

function parseJsonBody(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

function checkAndRecord(response, latencyMetric) {
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
  });
  successRate.add(success);
  if (success) {
    latencyMetric.add(response.timings.duration);
  }
  return success;
}

export default function () {
  let categories = [];
  let products = [];
  let selectedProductSlug = null;
  let selectedProductId = null;
  let selectedCategoryId = null;

  group("1. Browse Homepage & Categories", () => {
    const res = http.get(`${BASE_URL}/category/get-category`);
    if (checkAndRecord(res, categoryLatency)) {
      const payload = parseJsonBody(res);
      categories = Array.isArray(payload?.category) ? payload.category : [];
      if (categories.length > 0) {
        selectedCategoryId = categories[0]._id;
      }
    }
  });

  sleep(1);

  group("2. Filter Products", () => {
    const filterPayload = {
      checked: selectedCategoryId ? [selectedCategoryId] : [],
      radio: [],
    };

    const res = http.post(
      `${BASE_URL}/product/product-filters`,
      JSON.stringify(filterPayload),
      { headers: { "Content-Type": "application/json" } },
    );

    if (checkAndRecord(res, productListLatency)) {
      const payload = parseJsonBody(res);
      products = Array.isArray(payload?.products) ? payload.products : [];
      if (products.length > 0) {
        selectedProductSlug = products[0].slug;
        selectedProductId = products[0]._id;
        selectedCategoryId = products[0]?.category?._id || selectedCategoryId;
      }
    }
  });

  sleep(2);

  if (selectedProductSlug) {
    group("3. View Product Details", () => {
      const productRes = http.get(
        `${BASE_URL}/product/get-product/${selectedProductSlug}`,
      );
      checkAndRecord(productRes, productDetailLatency);

      const photoRes = http.get(
        `${BASE_URL}/product/product-photo/${selectedProductId}`,
      );
      checkAndRecord(photoRes, productPhotoLatency);

      if (selectedCategoryId) {
        const relatedRes = http.get(
          `${BASE_URL}/product/related-product/${selectedProductId}/${selectedCategoryId}`,
        );
        checkAndRecord(relatedRes, relatedProductLatency);
      }
    });
  }

  sleep(3);
}
