// Dong Cheng-Yu, A0262348B
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct";
import { useNavigate, useParams } from "react-router-dom";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useParams: jest.fn(),
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
  const Select = ({ children, onChange, placeholder, value }) => (
    <select
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      <option value="">-- select --</option>
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  return { Select };
});

const mockProduct = {
  _id: "prod1",
  name: "Test Product",
  description: "A great product",
  price: 99,
  quantity: 10,
  shipping: true,
  category: { _id: "cat1", name: "Electronics" },
};

const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
];

describe("UpdateProduct", () => {
  let navigateMock;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    useParams.mockReturnValue({ slug: "test-product" });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");

    axios.get.mockImplementation((url) => {
      if (url.includes("get-product")) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      if (url.includes("get-category")) {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete global.URL.createObjectURL;
  });

  // Helper: wait for the form to be pre-populated before interacting
  const waitForFormLoad = () => screen.findByDisplayValue("Test Product");

  describe("Rendering", () => {
    it("renders the page heading and action buttons", async () => {
      render(<UpdateProduct />);

      expect(screen.getByText("Update Product")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "UPDATE PRODUCT" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "DELETE PRODUCT" }),
      ).toBeInTheDocument();
    });

    it("pre-populates all fields with the fetched product data", async () => {
      render(<UpdateProduct />);
      await waitForFormLoad();

      expect(screen.getByPlaceholderText("write a name")).toHaveValue(
        "Test Product",
      );
      expect(screen.getByPlaceholderText("write a description")).toHaveValue(
        "A great product",
      );
      expect(screen.getByPlaceholderText("write a Price")).toHaveValue(99);
      expect(screen.getByPlaceholderText("write a quantity")).toHaveValue(10);
      expect(screen.getByLabelText("Select Shipping")).toHaveValue("1");
      expect(screen.getByLabelText("Select a category")).toHaveValue("cat1");
    });

    it("fetches and populates category options on mount", async () => {
      render(<UpdateProduct />);
      await waitForFormLoad();

      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Clothing")).toBeInTheDocument();
    });

    it("shows existing product image before a new photo is selected", async () => {
      render(<UpdateProduct />);
      await waitForFormLoad();

      const img = screen.getByAltText("product_photo");
      expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/prod1");
    });

    it("shows photo preview when a new file is selected", async () => {
      render(<UpdateProduct />);
      await waitForFormLoad();

      const file = new File(["img"], "new-photo.png", { type: "image/png" });
      fireEvent.change(screen.getByLabelText("Upload Photo"), {
        target: { files: [file] },
      });

      expect(screen.getByAltText("product_photo")).toHaveAttribute(
        "src",
        "blob:mock-url",
      );
    });

    it("shows filename on upload label after file is selected", async () => {
      render(<UpdateProduct />);
      await waitForFormLoad();

      const file = new File(["img"], "new-photo.png", { type: "image/png" });
      fireEvent.change(screen.getByLabelText("Upload Photo"), {
        target: { files: [file] },
      });

      expect(
        screen.getByText((content) => content.includes("new-photo.png")),
      ).toBeInTheDocument();
    });

    it("allows updating all form fields", async () => {
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.change(screen.getByPlaceholderText("write a Price"), {
        target: { value: "150" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
        target: { value: "25" },
      });
      fireEvent.change(screen.getByLabelText("Select a category"), {
        target: { value: "cat2" },
      });
      fireEvent.change(screen.getByLabelText("Select Shipping"), {
        target: { value: "0" },
      });

      expect(screen.getByPlaceholderText("write a Price")).toHaveValue(150);
      expect(screen.getByPlaceholderText("write a quantity")).toHaveValue(25);
      expect(screen.getByLabelText("Select a category")).toHaveValue("cat2");
      expect(screen.getByLabelText("Select Shipping")).toHaveValue("0");
    });
  });

  describe("getSingleProduct", () => {
    it("logs error when fetching product fails", async () => {
      const err = new Error("Network error");
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) return Promise.reject(err);
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
    });
  });

  describe("getAllCategory", () => {
    it("shows error toast and logs error when fetching categories fails", async () => {
      const err = new Error("Network error");
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        return Promise.reject(err);
      });

      render(<UpdateProduct />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something went wrong in getting category",
        );
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
    });

    it("does not populate categories when API returns success false", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("get-category")) {
          return Promise.resolve({ data: { success: false } });
        }
      });

      render(<UpdateProduct />);
      await waitForFormLoad();

      const categorySelect = screen.getByLabelText("Select a category");
      expect(within(categorySelect).getAllByRole("option")).toHaveLength(1);
    });
  });

  describe("handleUpdate — success", () => {
    it("sends FormData with trimmed name and description to the update endpoint", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "  Updated Name  " },
      });
      fireEvent.change(screen.getByPlaceholderText("write a description"), {
        target: { value: "  Updated description  " },
      });
      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/prod1",
          expect.any(FormData),
        );
      });
      const formData = axios.put.mock.calls[0][1];
      expect(formData.get("name")).toBe("Updated Name");
      expect(formData.get("description")).toBe("Updated description");
    });

    it("does not append photo to FormData when no new photo is selected", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      const formData = axios.put.mock.calls[0][1];
      expect(formData.get("photo")).toBeNull();
    });

    it("appends photo to FormData when a new photo is selected", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();
      const file = new File(["img"], "new-photo.png", { type: "image/png" });

      fireEvent.change(screen.getByLabelText("Upload Photo"), {
        target: { files: [file] },
      });
      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      const formData = axios.put.mock.calls[0][1];
      expect(formData.get("photo")).toBe(file);
    });

    it("shows success toast on successful update", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Product Updated Successfully",
        );
      });
    });

    it("navigates to /dashboard/admin/products on successful update", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith(
          "/dashboard/admin/products",
          expect.objectContaining({
            state: expect.objectContaining({ refresh: expect.any(Number) }),
          }),
        );
      });
    });
  });

  describe("handleUpdate — failure", () => {
    it("shows backend error message when update returns success false", async () => {
      axios.put.mockResolvedValue({
        data: { success: false, message: "Product name taken" },
      });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Product name taken");
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows fallback error when update returns success false without message", async () => {
      axios.put.mockResolvedValue({ data: { success: false } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update product");
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows error toast and logs error when update request throws", async () => {
      const err = new Error("Network error");
      axios.put.mockRejectedValue(err);
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "UPDATE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  describe("handleDelete — success", () => {
    it("does not delete when user cancels the confirm dialog", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(false);
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      expect(axios.delete).not.toHaveBeenCalled();
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("calls delete endpoint with correct product id when confirmed", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      axios.delete.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/product/delete-product/prod1",
        );
      });
    });

    it("shows success toast on successful delete", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      axios.delete.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Product deleted successfully",
        );
      });
    });

    it("navigates to /dashboard/admin/products on successful delete", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      axios.delete.mockResolvedValue({ data: { success: true } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith(
          "/dashboard/admin/products",
          expect.objectContaining({
            state: expect.objectContaining({ refresh: expect.any(Number) }),
          }),
        );
      });
    });
  });

  describe("handleDelete — failure", () => {
    it("shows backend error message when delete returns success false", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      axios.delete.mockResolvedValue({
        data: { success: false, message: "Delete failed" },
      });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Delete failed");
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows fallback error when delete returns success false without message", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      axios.delete.mockResolvedValue({ data: { success: false } });
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete product");
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows error toast and logs error when delete request throws", async () => {
      const err = new Error("Network error");
      jest.spyOn(window, "confirm").mockReturnValue(true);
      axios.delete.mockRejectedValue(err);
      render(<UpdateProduct />);
      await waitForFormLoad();

      fireEvent.click(screen.getByRole("button", { name: "DELETE PRODUCT" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
