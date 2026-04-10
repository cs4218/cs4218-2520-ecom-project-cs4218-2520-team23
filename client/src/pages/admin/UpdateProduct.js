// Improved by Dong Cheng-Yu, A0262348B
import React, { useState, useEffect } from "react";
import Layout from "./../../components/Layout";
import AdminMenu from "./../../components/AdminMenu";
import toast from "react-hot-toast";
import axios from "axios";
import { Select } from "antd";
import { useNavigate, useParams } from "react-router-dom";
const { Option } = Select;

const UpdateProduct = () => {
	const navigate = useNavigate();
	const params = useParams();
	const [categories, setCategories] = useState([]);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState("");
	const [category, setCategory] = useState("");
	const [quantity, setQuantity] = useState("");
	const [shipping, setShipping] = useState("");
	const [photo, setPhoto] = useState("");
	const [id, setId] = useState("");
	const [productNotFound, setProductNotFound] = useState(false);

	const getSingleProduct = async () => {
		try {
			const { data } = await axios.get(`/api/v1/product/get-product/${params.slug}`);
			if (!data?.success || !data?.product) {
				setProductNotFound(true);
				toast.error(data?.message || data?.error || "Product not found");
				return;
			}
			setProductNotFound(false);
			setName(data.product.name);
			setId(data.product._id);
			setDescription(data.product.description);
			setPrice(data.product.price);
			setCategory(data.product.category._id);
			setQuantity(data.product.quantity);
			setShipping(data.product.shipping ? "1" : "0");
		} catch (error) {
			console.error(error);
			setProductNotFound(true);
			const status = error?.response?.status;
			const errorMessage = error?.response?.data?.message || error?.response?.data?.error;
			if (status === 404) {
				toast.error(errorMessage || "Product not found");
			} else if (status === 401) {
				toast.error(errorMessage || "Unauthorized");
			} else if (status === 403) {
				toast.error(errorMessage || "Forbidden");
			} else {
				toast.error(errorMessage || "Something went wrong");
			}
		}
	};

	useEffect(() => {
		getSingleProduct();
		getAllCategory();
		//eslint-disable-next-line
	}, []);

	const getAllCategory = async () => {
		try {
			const { data } = await axios.get("/api/v1/category/get-category");
			if (data?.success) {
				setCategories(data?.category);
			}
		} catch (error) {
			console.error(error);
			toast.error("Something went wrong in getting category");
		}
	};

	const getErrorMessage = (data, fallback) => {
		return data?.message || data?.error || fallback;
	};

	const validateUpdateInput = () => {
		const trimmedName = name.trim();
		const trimmedDescription = description.trim();
		const numericPrice = Number(price);
		const numericQuantity = Number(quantity);

		if (!trimmedName) {
			toast.error("Name is required");
			return false;
		}
		if (!trimmedDescription) {
			toast.error("Description is required");
			return false;
		}
		if (price === "" || Number.isNaN(numericPrice)) {
			toast.error("Price is required");
			return false;
		}
		if (numericPrice <= 0) {
			toast.error("Price must be greater than 0");
			return false;
		}
		if (quantity === "" || Number.isNaN(numericQuantity)) {
			toast.error("Quantity is required");
			return false;
		}
		if (numericQuantity < 0) {
			toast.error("Quantity must be positive");
			return false;
		}
		if (photo && photo.size > 1000000) {
			toast.error("Photo should be less than 1MB");
			return false;
		}

		return true;
	};

	const handleUpdate = async (e) => {
		e.preventDefault();
		if (productNotFound) {
			toast.error("Product not found");
			return;
		}
		if (!validateUpdateInput()) {
			return;
		}
		try {
			const productData = new FormData();
			productData.append("name", name.trim());
			productData.append("description", description.trim());
			productData.append("price", price);
			productData.append("quantity", quantity);
			photo && productData.append("photo", photo);
			productData.append("category", category);
			productData.append("shipping", shipping);

			const { data } = await axios.put(`/api/v1/product/update-product/${id}`, productData);

			if (data?.success) {
				toast.success("Product Updated Successfully");
				// Add timestamp to force image refresh in the products list
				navigate("/dashboard/admin/products", {
					state: { refresh: Date.now() },
				});
			} else {
				toast.error(getErrorMessage(data, "Failed to update product"));
			}
		} catch (error) {
			console.error(error);
			const status = error?.response?.status;
			const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
			if (status === 401) {
				toast.error(serverMessage || "Unauthorized");
			} else if (status === 403) {
				toast.error(serverMessage || "Forbidden");
			} else if (status === 404) {
				toast.error(serverMessage || "Product not found");
			} else {
				toast.error(serverMessage || "Something went wrong");
			}
		}
	};

	const handleDelete = async () => {
		try {
			if (productNotFound) {
				toast.error("Product not found");
				return;
			}
			if (!window.confirm("Are you sure you want to delete this product?")) return;
			const { data } = await axios.delete(`/api/v1/product/delete-product/${id}`);
			if (data?.success) {
				toast.success("Product deleted successfully");
				navigate("/dashboard/admin/products", {
					state: { refresh: Date.now() },
				});
			} else {
				toast.error(getErrorMessage(data, "Failed to delete product"));
			}
		} catch (error) {
			console.error(error);
			const status = error?.response?.status;
			const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
			if (status === 401) {
				toast.error(serverMessage || "Unauthorized");
			} else if (status === 403) {
				toast.error(serverMessage || "Forbidden");
			} else if (status === 404) {
				toast.error(serverMessage || "Product not found");
			} else {
				toast.error(serverMessage || "Something went wrong");
			}
		}
	};

	return (
		<Layout title={"Dashboard - Update Product"}>
			<div className="container-fluid m-3 p-3">
				<div className="row">
					<div className="col-md-3">
						<AdminMenu />
					</div>
					<div className="col-md-9">
						<h1>Update Product</h1>
						<div className="m-1 w-75">
							<Select
								bordered={false}
								placeholder="Select a category"
								size="large"
								showSearch
								className="form-select mb-3"
								onChange={(value) => setCategory(value)}
								value={category}
							>
								{categories?.map((c) => (
									<Option key={c._id} value={c._id}>
										{c.name}
									</Option>
								))}
							</Select>
							<div className="mb-3">
								<label className="btn btn-outline-secondary col-md-12">
									{photo ? photo.name : "Upload Photo"}
									<input
										type="file"
										name="photo"
										accept="image/*"
										aria-label="Upload Photo"
										onChange={(e) => setPhoto(e.target.files[0])}
										hidden
									/>
								</label>
							</div>
							<div className="mb-3">
								{photo ? (
									<div className="text-center">
										<img
											src={URL.createObjectURL(photo)}
											alt="product_photo"
											height={"200px"}
											className="img img-responsive"
										/>
									</div>
								) : (
									<div className="text-center">
										<img
											src={`/api/v1/product/product-photo/${id}`}
											alt="product_photo"
											height={"200px"}
											className="img img-responsive"
										/>
									</div>
								)}
							</div>
							<div className="mb-3">
								<input
									type="text"
									value={name}
									placeholder="write a name"
									className="form-control"
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
							<div className="mb-3">
								<textarea
									type="text"
									value={description}
									placeholder="write a description"
									className="form-control"
									onChange={(e) => setDescription(e.target.value)}
								/>
							</div>
							<div className="mb-3">
								<input
									type="number"
									value={price}
									placeholder="write a Price"
									className="form-control"
									onChange={(e) => setPrice(e.target.value)}
								/>
							</div>
							<div className="mb-3">
								<input
									type="number"
									value={quantity}
									placeholder="write a quantity"
									className="form-control"
									onChange={(e) => setQuantity(e.target.value)}
								/>
							</div>
							<div className="mb-3">
								<Select
									bordered={false}
									placeholder="Select Shipping"
									size="large"
									showSearch
									className="form-select mb-3"
									onChange={(value) => setShipping(value)}
									value={shipping}
								>
									<Option value="0">No</Option>
									<Option value="1">Yes</Option>
								</Select>
							</div>
							<div className="mb-3">
								{productNotFound && (
									<div className="alert alert-danger" role="alert">
										Product not found
									</div>
								)}
							</div>
							<div className="mb-3">
								<button
									className="btn btn-primary"
									onClick={handleUpdate}
									disabled={productNotFound || !id}
								>
									UPDATE PRODUCT
								</button>
							</div>
							<div className="mb-3">
								<button
									className="btn btn-danger"
									onClick={handleDelete}
									disabled={productNotFound || !id}
								>
									DELETE PRODUCT
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default UpdateProduct;
