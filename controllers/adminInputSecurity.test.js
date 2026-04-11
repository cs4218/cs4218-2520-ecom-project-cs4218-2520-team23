const { maliciousTextPayloads, maliciousPhotoVectors } = require("../helpers/xssPayloadMatrix.js");

const mockProductSave = jest.fn();
const mockProductFindByIdAndUpdate = jest.fn();
const mockReadFileSync = jest.fn();
const mockSlugify = jest.fn((value) => String(value).toLowerCase().replace(/\s+/g, "-"));

const mockProductModel = jest.fn(function (doc) {
	Object.assign(this, doc);
	this.photo = this.photo || { data: null, contentType: null };
	this.save = mockProductSave;
});
mockProductModel.findByIdAndUpdate = mockProductFindByIdAndUpdate;

const mockCategoryCtor = jest.fn();
mockCategoryCtor.findOne = jest.fn();

jest.mock("../models/productModel.js", () => ({
	__esModule: true,
	default: mockProductModel,
}));

jest.mock("../models/categoryModel.js", () => {
	const ctor = mockCategoryCtor;
	return ctor;
});

jest.mock("../models/orderModel.js", () => ({ __esModule: true, default: {} }));

jest.mock("fs", () => ({
	__esModule: true,
	default: { readFileSync: mockReadFileSync },
}));

jest.mock("slugify", () => ({
	__esModule: true,
	default: mockSlugify,
}));

jest.mock("dotenv", () => ({
	__esModule: true,
	default: { config: jest.fn() },
}));

jest.mock("braintree", () => ({
	__esModule: true,
	default: {
		Environment: { Sandbox: {} },
		BraintreeGateway: jest.fn(() => ({
			clientToken: { generate: jest.fn() },
			transaction: { sale: jest.fn() },
		})),
	},
}));

const { createProductController, updateProductController } = require("./productController.js");
const { createCategoryController } = require("./categoryController.js");

function makeRes() {
	const res = {};
	res.status = jest.fn(() => res);
	res.send = jest.fn(() => res);
	return res;
}

describe("Admin input security checks", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("product create persists malicious text payload as inert data", async () => {
		const req = {
			fields: {
				name: maliciousTextPayloads.scriptTag,
				description: maliciousTextPayloads.imgOnError,
				price: 10,
				category: "cat-1",
				quantity: 1,
			},
			files: {
				photo: { size: 100, path: "/tmp/payload.png", type: "image/png" },
			},
		};
		const res = makeRes();

		mockReadFileSync.mockReturnValue(Buffer.from("ok"));
		mockProductSave.mockResolvedValue({ _id: "p1" });

		await createProductController(req, res);

		expect(mockProductModel).toHaveBeenCalledWith(
			expect.objectContaining({
				name: maliciousTextPayloads.scriptTag,
				description: maliciousTextPayloads.imgOnError,
			}),
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	test("product update accepts malicious URL payload in description field", async () => {
		const req = {
			params: { pid: "p1" },
			fields: {
				name: "safe-name",
				description: maliciousTextPayloads.javascriptUrl,
				price: 11,
				category: "cat-1",
				quantity: 2,
			},
			files: {},
		};
		const res = makeRes();

		const updatedDoc = {
			photo: { data: null, contentType: null },
			save: mockProductSave,
		};
		mockProductFindByIdAndUpdate.mockResolvedValue(updatedDoc);
		mockProductSave.mockResolvedValue(updatedDoc);

		await updateProductController(req, res);

		expect(mockProductFindByIdAndUpdate).toHaveBeenCalledWith(
			"p1",
			expect.objectContaining({ description: maliciousTextPayloads.javascriptUrl }),
			{ new: true },
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	test("category create accepts script payload as category name", async () => {
		const req = { body: { name: maliciousTextPayloads.svgOnLoad } };
		const res = makeRes();

		mockCategoryCtor.findOne.mockResolvedValue(null);
		const savedDoc = { _id: "c1", name: maliciousTextPayloads.svgOnLoad };
		const saveMock = jest.fn().mockResolvedValue(savedDoc);
		mockCategoryCtor.mockImplementationOnce(() => ({ save: saveMock }));

		await createCategoryController(req, res);

		expect(mockCategoryCtor).toHaveBeenCalledWith(
			expect.objectContaining({ name: maliciousTextPayloads.svgOnLoad }),
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	test("rejects malicious photo MIME on product create", async () => {
		const req = {
			fields: {
				name: "photo-mime-check",
				description: "checking upload policy",
				price: 20,
				category: "cat-1",
				quantity: 1,
			},
			files: {
				photo: {
					size: 100,
					path: "/tmp/malicious.bin",
					type: maliciousPhotoVectors.executableMime.mimeType,
				},
			},
		};
		const res = makeRes();

		await createProductController(req, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({ error: "Invalid photo type" });
		expect(mockProductModel).not.toHaveBeenCalled();
		expect(mockProductSave).not.toHaveBeenCalled();
	});

	test("rejects svg upload MIME on product update", async () => {
		const req = {
			params: { pid: "p1" },
			fields: {
				name: "safe-name",
				description: "safe description",
				price: 11,
				category: "cat-1",
				quantity: 2,
			},
			files: {
				photo: {
					size: 100,
					path: "/tmp/malicious.svg",
					type: maliciousPhotoVectors.svgWithScript.mimeType,
				},
			},
		};
		const res = makeRes();

		await updateProductController(req, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({ error: "Invalid photo type" });
		expect(mockProductFindByIdAndUpdate).not.toHaveBeenCalled();
		expect(mockProductSave).not.toHaveBeenCalled();
	});
});
