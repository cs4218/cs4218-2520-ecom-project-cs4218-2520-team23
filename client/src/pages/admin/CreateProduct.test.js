// Dong Cheng-Yu, A0262348B
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";
import { useNavigate } from "react-router-dom";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
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

// Mock Select to render a native <select> so fireEvent works without Ant Design internals
jest.mock("antd", () => ({
  Select: ({ children, onChange, placeholder }) => (
    <select aria-label={placeholder} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- select --</option>
      {children}
    </select>
  ),
}));

// Expose Option as a passthrough so <Option value="x">Label</Option> renders as <option>
jest.mock("antd", () => {
  const Select = ({ children, onChange, placeholder }) => (
    <select aria-label={placeholder} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- select --</option>
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  return { Select };
});

const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
];

describe("CreateProduct", () => {
  let navigateMock;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    // jsdom doesn't implement createObjectURL — stub globally so any test
    // that triggers file selection doesn't crash on the photo preview render
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    // Default: categories load successfully
    axios.get.mockResolvedValue({
      data: { success: true, category: mockCategories },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete global.URL.createObjectURL;
  });

  // Helper: fill all product fields
  const fillForm = () => {
    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Test Product" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "A great product" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Select a category"), {
      target: { value: "cat1" },
    });
    fireEvent.change(screen.getByLabelText("Select Shipping"), {
      target: { value: "1" },
    });
  };

  describe("Rendering", () => {
    it("renders the page heading and all form fields", async () => {
      render(<CreateProduct />);

      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a description"),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a Price")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a quantity"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "CREATE PRODUCT" }),
      ).toBeInTheDocument();
    });

    it("fetches and populates category options on mount", async () => {
      render(<CreateProduct />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("Clothing")).toBeInTheDocument();
      });
    });

    it("shows error toast and logs error when fetching categories fails", async () => {
      const err = new Error("Network error");
      axios.get.mockRejectedValue(err);
      render(<CreateProduct />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something went wrong in getting category",
        );
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
    });

    it("shows photo preview when a file is selected", async () => {
      render(<CreateProduct />);

      const file = new File(["img"], "photo.png", { type: "image/png" });
      fireEvent.change(screen.getByLabelText("Upload Photo"), {
        target: { files: [file] },
      });

      expect(screen.getByAltText("product_photo")).toBeInTheDocument();
    });

    it("shows filename on upload label after file is selected", async () => {
      render(<CreateProduct />);

      const file = new File(["img"], "photo.png", { type: "image/png" });
      fireEvent.change(screen.getByLabelText("Upload Photo"), {
        target: { files: [file] },
      });

      // The filename is rendered inside the <label> which also contains the
      // hidden input, so we match by text content inclusion rather than exact text
      expect(
        screen.getByText((content) => content.includes("photo.png")),
      ).toBeInTheDocument();
    });
  });

  describe("handleCreate — success", () => {
    it("sends FormData with all field values to the create endpoint", async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(FormData),
        );
      });

      const formData = axios.post.mock.calls[0][1];
      expect(formData.get("name")).toBe("Test Product");
      expect(formData.get("description")).toBe("A great product");
      expect(formData.get("price")).toBe("99");
      expect(formData.get("quantity")).toBe("10");
      expect(formData.get("category")).toBe("cat1");
    });

    it("shows success toast on successful create", async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Product Created Successfully",
        );
      });
    });

    it("navigates to /dashboard/admin/products on successful create", async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith("/dashboard/admin/products");
      });
    });
  });

  describe("handleCreate — failure", () => {
    it("shows backend error message when create returns success false", async () => {
      axios.post.mockResolvedValue({
        data: { success: false, message: "Product name already exists" },
      });
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Product name already exists");
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows fallback error message when create returns success false without message", async () => {
      axios.post.mockResolvedValue({ data: { success: false } });
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create product");
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows error toast and logs error when create request throws", async () => {
      const err = new Error("Network error");
      axios.post.mockRejectedValue(err);
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("does not show success toast on failure", async () => {
      axios.post.mockResolvedValue({ data: { success: false } });
      render(<CreateProduct />);
      await screen.findByText("Electronics");

      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "CREATE PRODUCT" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
