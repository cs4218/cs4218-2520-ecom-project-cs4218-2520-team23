const { test, expect } = require("@playwright/test");

const validUser = {
	name: "Playwright User",
	email: `playwright.user.${Date.now()}@example.com`,
	password: "password123",
	phone: "98765432",
	address: "123 Test Street",
	DOB: "2000-01-01",
	answer: "Basketball",
};

const loggedInUser = {
	name: "Logged In User",
	email: "loggedin.user@example.com",
	phone: "12345678",
	role: 0,
};

async function mockCommonRoutes(page) {
	await page.route("**/api/v1/category/get-category", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				category: [],
			}),
		});
	});
}

async function fillRegisterForm(page, overrides = {}) {
	const data = { ...validUser, ...overrides };

	await page.getByPlaceholder(/(enter\s+your\s+)?name/i).fill(data.name);
	await page.getByPlaceholder(/(enter\s+your\s+)?email/i).fill(data.email);
	await page.getByPlaceholder(/(enter\s+your\s+)?password/i).fill(data.password);
	await page.getByPlaceholder(/(enter\s+your\s+)?phone/i).fill(data.phone);
	await page.getByPlaceholder(/(enter\s+your\s+)?address/i).fill(data.address);
	await page.getByTestId("dob-input").fill(data.DOB);
	await page.getByLabel(/security question answer/i).fill(data.answer);
}

async function fillLoginForm(page, overrides = {}) {
	const data = {
		email: validUser.email,
		password: validUser.password,
		...overrides,
	};

	await page.getByPlaceholder(/(enter\s+your\s+)?email/i).fill(data.email);
	await page.getByPlaceholder(/(enter\s+your\s+)?password/i).fill(data.password);
}

test.describe("Auth Success Flows", () => {
	test("Successful registration and login flow", async ({ page }) => {
		await mockCommonRoutes(page);

		await page.route("**/api/v1/auth/register", async (route) => {
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					message: "User Register Successfully",
				}),
			});
		});

		await page.route("**/api/v1/auth/login", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					message: "login successfully",
					user: {
						...loggedInUser,
						email: validUser.email,
						name: validUser.name,
					},
					token: "fake-jwt-token",
				}),
			});
		});

		await page.goto("/");

		await page.getByRole("link", { name: /^register$/i }).click();
		await expect(page.getByRole("heading", { name: /register/i })).toBeVisible();

		await fillRegisterForm(page);
		await page.getByRole("button", { name: /^register$/i }).click();

		await expect(page.getByText(/register successfully, please login/i)).toBeVisible();
		await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();

		await fillLoginForm(page);
		await page.getByRole("button", { name: /^log\s?in$/i }).click();

		await expect(page.getByText(/login successfully/i)).toBeVisible();
		await expect(page.getByRole("button", { name: new RegExp(validUser.name, "i") })).toBeVisible();
	});

	test("Successful logout flow", async ({ page }) => {
		await mockCommonRoutes(page);

		await page.addInitScript(
			({ user }) => {
				localStorage.setItem(
					"auth",
					JSON.stringify({
						user,
						token: "fake-jwt-token",
					}),
				);
			},
			{ user: loggedInUser },
		);

		await page.goto("/");

		const usernameLink = page.getByRole("button", { name: new RegExp(loggedInUser.name, "i") });
		await expect(usernameLink).toBeVisible();

		await usernameLink.click();
		await page.getByRole("link", { name: /^logout$/i }).click();

		await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /^register$/i })).toBeVisible();
		await expect(page.getByRole("button", { name: new RegExp(loggedInUser.name, "i") })).toHaveCount(0);
	});
});

test.describe("Auth Client-Side Validation", () => {
	test("Registering with invalid email (missing @) should display correct message", async ({ page }) => {
		await mockCommonRoutes(page);

		let registerRequestCount = 0;
		await page.route("**/api/v1/auth/register", async (route) => {
			registerRequestCount += 1;
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({ success: true, message: "User Register Successfully" }),
			});
		});

		await page.goto("/");
		await page.getByRole("link", { name: /^register$/i }).click();

		await fillRegisterForm(page, { email: "invalidemail" });
		await page.getByRole("button", { name: /^register$/i }).click();

		const message = await page
			.getByPlaceholder(/(enter\s+your\s+)?email/i)
			.evaluate((element) => element.validationMessage);

		expect(message).toMatch(/@|valid email|include an '@'/i);
		expect(registerRequestCount).toBe(0);
	});

	test("Logging in with invalid email (missing @) should display correct message", async ({ page }) => {
		await mockCommonRoutes(page);

		let loginRequestCount = 0;
		await page.route("**/api/v1/auth/login", async (route) => {
			loginRequestCount += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true, message: "login successfully", user: loggedInUser, token: "t" }),
			});
		});

		await page.goto("/login");
		await fillLoginForm(page, { email: "invalidemail" });
		await page.getByRole("button", { name: /^log\s?in$/i }).click();

		const message = await page
			.getByPlaceholder(/(enter\s+your\s+)?email/i)
			.evaluate((element) => element.validationMessage);

		expect(message).toMatch(/@|valid email|include an '@'/i);
		expect(loginRequestCount).toBe(0);
	});

	test("Clicking register with an incomplete field should trigger correct error message", async ({ page }) => {
		await mockCommonRoutes(page);

		let registerRequestCount = 0;
		await page.route("**/api/v1/auth/register", async (route) => {
			registerRequestCount += 1;
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({ success: true, message: "User Register Successfully" }),
			});
		});

		await page.goto("/register");
		await fillRegisterForm(page, { address: "" });
		await page.getByRole("button", { name: /^register$/i }).click();

		const message = await page
			.getByPlaceholder(/(enter\s+your\s+)?address/i)
			.evaluate((element) => element.validationMessage);

		expect(message).toMatch(/fill out this field|required/i);
		expect(registerRequestCount).toBe(0);
	});

	test("Clicking login with an incomplete field should trigger correct error message", async ({ page }) => {
		await mockCommonRoutes(page);

		let loginRequestCount = 0;
		await page.route("**/api/v1/auth/login", async (route) => {
			loginRequestCount += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true, message: "login successfully", user: loggedInUser, token: "t" }),
			});
		});

		await page.goto("/login");
		await fillLoginForm(page, { password: "" });
		await page.getByRole("button", { name: /log\s?in/i }).click();

		const message = await page
			.getByPlaceholder(/(enter\s+your\s+)?password/i)
			.evaluate((element) => element.validationMessage);

		expect(message).toMatch(/fill out this field|required/i);
		expect(loginRequestCount).toBe(0);
	});

	test("Clicking register with invalid email (missing domain after @) should trigger correct error message", async ({
		page,
	}) => {
		await mockCommonRoutes(page);

		let registerRequestCount = 0;
		await page.route("**/api/v1/auth/register", async (route) => {
			registerRequestCount += 1;
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({ success: true, message: "User Register Successfully" }),
			});
		});

		await page.goto("/register");
		await fillRegisterForm(page, { email: "invalid@" });
		await page.getByRole("button", { name: /^register$/i }).click();

		const message = await page
			.getByPlaceholder(/(enter\s+your\s+)?email/i)
			.evaluate((element) => element.validationMessage);

		expect(message).toMatch(/following '@'|valid email|incomplete/i);
		expect(registerRequestCount).toBe(0);
	});

	test("Clicking login with invalid email (missing domain after @) should trigger correct error message", async ({
		page,
	}) => {
		await mockCommonRoutes(page);

		let loginRequestCount = 0;
		await page.route("**/api/v1/auth/login", async (route) => {
			loginRequestCount += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true, message: "login successfully", user: loggedInUser, token: "t" }),
			});
		});

		await page.goto("/login");
		await fillLoginForm(page, { email: "invalid@" });
		await page.getByRole("button", { name: /^log\s?in$/i }).click();

		const message = await page
			.getByPlaceholder(/(enter\s+your\s+)?email/i)
			.evaluate((element) => element.validationMessage);

		expect(message).toMatch(/following '@'|valid email|incomplete/i);
		expect(loginRequestCount).toBe(0);
	});
});

test.describe("Additional Auth Error Handling", () => {
	test("Registering with an already-used email shows backend error and stays on register page", async ({ page }) => {
		await mockCommonRoutes(page);

		await page.route("**/api/v1/auth/register", async (route) => {
			await route.fulfill({
				status: 409,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					message: "Existing account found.",
				}),
			});
		});

		await page.goto("/register");
		await fillRegisterForm(page, { email: "already.used@example.com" });
		await page.getByRole("button", { name: /^register$/i }).click();

		await expect(page.getByText(/existing account found/i)).toBeVisible();
		await expect(page.getByRole("heading", { name: /register/i })).toBeVisible();
	});

	test("Login with unregistered email shows backend error and does not show authenticated header", async ({
		page,
	}) => {
		await mockCommonRoutes(page);

		await page.route("**/api/v1/auth/login", async (route) => {
			await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					message: "Email is not registered",
				}),
			});
		});

		await page.goto("/login");
		await fillLoginForm(page, {
			email: "not.registered@example.com",
			password: "wrong-password",
		});
		await page.getByRole("button", { name: /^log\s?in$/i }).click();

		await expect(page.getByText(/email is not registered/i)).toBeVisible();
		await expect(page.getByRole("link", { name: /^log\s?in$/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /^register$/i })).toBeVisible();
	});

	test("Login with wrong password for existing account shows backend error and does not show authenticated header", async ({
		page,
	}) => {
		await mockCommonRoutes(page);

		await page.route("**/api/v1/auth/login", async (route) => {
			const body = route.request().postDataJSON();

			if (body?.email === "existing.user@example.com" && body?.password === "wrong-password") {
				await route.fulfill({
					status: 401,
					contentType: "application/json",
					body: JSON.stringify({
						success: false,
						message: "Invalid Password",
					}),
				});
				return;
			}

			await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					message: "Email is not registered",
				}),
			});
		});

		await page.goto("/login");
		await fillLoginForm(page, {
			email: "existing.user@example.com",
			password: "wrong-password",
		});
		await page.getByRole("button", { name: /^log\s?in$/i }).click();

		await expect(page.getByText(/invalid password/i)).toBeVisible();

		// User should still see login/register options and should not see authenticated header
		await expect(page.getByRole("link", { name: /^log\s?in$/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /^register$/i })).toBeVisible();
	});
});
