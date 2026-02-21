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
import CreateCategory from "./CreateCategory";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
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

jest.mock(
  "../../components/Form/CategoryForm",
  () =>
    function MockCategoryForm({ handleSubmit, value, setValue }) {
      return (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Enter category name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form>
      );
    },
);

// Ant Design Modal: render children only when open, expose onCancel via a close button
jest.mock("antd", () => ({
  Modal: ({ children, open, onCancel }) =>
    open ? (
      <div role="dialog">
        <button onClick={onCancel}>Close Modal</button>
        {children}
      </div>
    ) : null,
}));

const mockCategories = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Clothing" },
];

describe("CreateCategory", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    // Default: getAllCategory resolves with categories
    axios.get.mockResolvedValue({
      data: { success: true, category: mockCategories },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Rendering", () => {
    it("renders the page heading and category form on load", async () => {
      render(<CreateCategory />);

      expect(screen.getByText("Manage Category")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter category name"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Submit" }),
      ).toBeInTheDocument();
    });

    it("fetches and displays all categories on mount", async () => {
      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });
      expect(screen.getByText("Clothing")).toBeInTheDocument();
    });

    it("renders Edit and Delete buttons for each category", async () => {
      render(<CreateCategory />);

      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
      });
      expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
    });

    it("does not render the modal on initial load", async () => {
      render(<CreateCategory />);

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });
  });

  describe("getAllCategory", () => {
    it("shows error toast when fetching categories fails", async () => {
      axios.get.mockRejectedValue(new Error("Network error"));
      render(<CreateCategory />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something went wrong in getting category",
        );
      });
    });

    it("logs error to console when fetching categories fails", async () => {
      const err = new Error("Network error");
      axios.get.mockRejectedValue(err);
      render(<CreateCategory />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(err);
      });
    });
  });

  describe("handleSubmit — create category", () => {
    it("calls create endpoint with entered name on submit", async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: "Category created" },
      });
      render(<CreateCategory />);

      fireEvent.change(screen.getByPlaceholderText("Enter category name"), {
        target: { value: "Books" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "Books" },
        );
      });
    });

    it("shows success toast and refreshes list on successful create", async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: "Category created" },
      });
      render(<CreateCategory />);

      fireEvent.change(screen.getByPlaceholderText("Enter category name"), {
        target: { value: "Books" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Category created");
      });
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it("shows backend error message when create returns success false", async () => {
      axios.post.mockResolvedValue({
        data: { success: false, message: "Category already exists" },
      });
      render(<CreateCategory />);

      fireEvent.change(screen.getByPlaceholderText("Enter category name"), {
        target: { value: "Electronics" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Category already exists");
      });
      expect(axios.get).toHaveBeenCalledTimes(1); // no refresh on failure
    });

    it("shows error toast and logs error when create request throws", async () => {
      const err = new Error("Network error");
      axios.post.mockRejectedValue(err);
      render(<CreateCategory />);

      fireEvent.change(screen.getByPlaceholderText("Enter category name"), {
        target: { value: "Books" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    });
  });

  describe("handleUpdate — edit category", () => {
    it("opens modal with pre-filled name when Edit is clicked", async () => {
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Electronics")).toBeInTheDocument();
    });

    it("calls update endpoint with correct id and new name", async () => {
      axios.put.mockResolvedValue({
        data: { success: true },
      });
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

      fireEvent.change(screen.getByDisplayValue("Electronics"), {
        target: { value: "Tech" },
      });
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Submit",
        }),
      );

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/1",
          { name: "Tech" },
        );
      });
    });

    it("shows success toast, closes modal and refreshes list on successful update", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      fireEvent.change(screen.getByDisplayValue("Electronics"), {
        target: { value: "Tech" },
      });
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Submit",
        }),
      );

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Tech is updated");
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it("shows backend error message when update returns success false", async () => {
      axios.put.mockResolvedValue({
        data: { success: false, message: "Update failed" },
      });
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Submit",
        }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
      expect(screen.getByRole("dialog")).toBeInTheDocument(); // modal stays open
    });

    it("shows error toast and logs error when update request throws", async () => {
      const err = new Error("Network error");
      axios.put.mockRejectedValue(err);
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Submit",
        }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    });

    it("closes modal when cancel is clicked", async () => {
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Close Modal" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("handleDelete — delete category", () => {
    it("calls delete endpoint with correct category id", async () => {
      axios.delete.mockResolvedValue({ data: { success: true } });
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/1",
        );
      });
    });

    it("shows success toast and refreshes list on successful delete", async () => {
      axios.delete.mockResolvedValue({ data: { success: true } });
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("category is deleted");
      });
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it("shows backend error message when delete returns success false", async () => {
      axios.delete.mockResolvedValue({
        data: { success: false, message: "Delete failed" },
      });
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Delete failed");
      });
      expect(axios.get).toHaveBeenCalledTimes(1); // no refresh on failure
    });

    it("shows error toast and logs error when delete request throws", async () => {
      const err = new Error("Network error");
      axios.delete.mockRejectedValue(err);
      render(<CreateCategory />);

      await screen.findByText("Electronics");
      fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    });
  });
});
