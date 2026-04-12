// Written by Pan Xinping, A0228445B

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import CreateCategory from "./CreateCategory";
import CreateProduct from "./CreateProduct";

const { maliciousTextPayloads } = require("../../../../helpers/xssPayloadMatrix.js");

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
	success: jest.fn(),
	error: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
	useNavigate: () => jest.fn(),
}));

jest.mock(
	"../../components/Layout",
	() =>
		function MockLayout({ children }) {
			return <div>{children}</div>;
		},
);

jest.mock(
	"../../components/AdminMenu",
	() =>
		function MockAdminMenu() {
			return <div>AdminMenu</div>;
		},
);

jest.mock("antd", () => {
	const Select = ({ children, onChange, placeholder }) => (
		<select aria-label={placeholder} onChange={(e) => onChange(e.target.value)}>
			<option value="">-- select --</option>
			{children}
		</select>
	);
	Select.Option = ({ value, children }) => <option value={value}>{children}</option>;

	const Modal = ({ children, open }) => (open ? <div>{children}</div> : null);
	return { Select, Modal };
});

jest.mock(
	"../../components/Form/CategoryForm",
	() =>
		function MockCategoryForm({ handleSubmit, value, setValue }) {
			return (
				<form onSubmit={handleSubmit}>
					<input placeholder="Enter category name" value={value} onChange={(e) => setValue(e.target.value)} />
					<button type="submit">Submit</button>
				</form>
			);
		},
);

describe("Admin payload submission behavior", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		global.URL.createObjectURL = jest.fn(() => "blob:preview");
	});

	afterEach(() => {
		delete global.URL.createObjectURL;
	});

	test("CreateCategory submits script payload unchanged", async () => {
		axios.get.mockResolvedValue({ data: { success: true, category: [] } });
		axios.post.mockResolvedValue({ data: { success: true, message: "ok" } });

		render(<CreateCategory />);

		fireEvent.change(screen.getByPlaceholderText("Enter category name"), {
			target: { value: maliciousTextPayloads.scriptTag },
		});
		fireEvent.click(screen.getByRole("button", { name: "Submit" }));

		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", {
				name: maliciousTextPayloads.scriptTag,
			});
		});
	});

	test("CreateProduct sends payload strings in FormData fields", async () => {
		axios.get.mockResolvedValue({
			data: { success: true, category: [{ _id: "cat1", name: "Electronics" }] },
		});
		axios.post.mockResolvedValue({ data: { success: true } });

		render(<CreateProduct />);

		fireEvent.change(screen.getByPlaceholderText("write a name"), {
			target: { value: maliciousTextPayloads.imgOnError },
		});
		fireEvent.change(screen.getByPlaceholderText("write a description"), {
			target: { value: maliciousTextPayloads.iframeTag },
		});
		fireEvent.change(screen.getByPlaceholderText("write a Price"), {
			target: { value: "15" },
		});
		fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
			target: { value: "2" },
		});
		fireEvent.change(screen.getByLabelText("Select a category"), {
			target: { value: "cat1" },
		});
		fireEvent.change(screen.getByLabelText("Select Shipping"), {
			target: { value: "1" },
		});

		const file = new File(["img"], "safe.png", { type: "image/png" });
		fireEvent.change(screen.getByLabelText("Upload Photo"), {
			target: { files: [file] },
		});

		fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/create-product", expect.any(FormData));
		});

		const payload = axios.post.mock.calls[0][1];
		expect(payload.get("name")).toBe(maliciousTextPayloads.imgOnError);
		expect(payload.get("description")).toBe(maliciousTextPayloads.iframeTag);
	});
});
