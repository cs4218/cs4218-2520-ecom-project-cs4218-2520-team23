import React, { useState, useEffect } from "react";
import Layout from "./../../components/Layout";
import AdminMenu from "./../../components/AdminMenu";
import toast from "react-hot-toast";
import axios from "axios";
import { Select } from "antd";
import { useNavigate } from "react-router-dom";
const { Option } = Select;

const CreateProduct = () => {
	const navigate = useNavigate();
	const [categories, setCategories] = useState([]);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState("");
	const [category, setCategory] = useState("");
	const [quantity, setQuantity] = useState("");
	const [shipping, setShipping] = useState("");
	const [photo, setPhoto] = useState("");

	// get all category
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

	useEffect(() => {
		getAllCategory();
	}, []);

	const getErrorMessage = (data, fallback) => {
		const message = data?.message || data?.error || fallback;
		if (typeof message === "string") {
			return message.replace(/crearing/gi, "creating");
		}
		return fallback;
	};

	const validateCreateInput = () => {
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
		if (!photo) {
			toast.error("Photo is required");
			return false;
		}
		if (photo.size > 1000000) {
			toast.error("Photo should be less than 1MB");
			return false;
		}
		if (shipping === "") {
			toast.error("Please select a shipping option");
			return false;
		}

		return true;
	};

	// create product function
	const handleCreate = async (e) => {
		e.preventDefault();
		if (!validateCreateInput()) {
			return;
		}
		try {
			const productData = new FormData();
			productData.append("name", name.trim());
			productData.append("description", description.trim());
			productData.append("price", price);
			productData.append("quantity", quantity);
			productData.append("photo", photo);
			productData.append("category", category);
			productData.append("shipping", shipping);

			const { data } = await axios.post("/api/v1/product/create-product", productData);

			if (data?.success) {
				toast.success("Product Created Successfully");
				navigate("/dashboard/admin/products");
			} else {
				toast.error(getErrorMessage(data, "Failed to create product"));
			}
		} catch (error) {
			console.error(error);
			const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
			if (typeof serverMessage === "string") {
				toast.error(serverMessage.replace(/crearing/gi, "creating"));
			} else {
				toast.error("Something went wrong");
			}
		}
	};

	return (
		<Layout title={"Dashboard - Create Product"}>
			<div className="container-fluid m-3 p-3">
				<div className="row">
					<div className="col-md-3">
						<AdminMenu />
					</div>
					<div className="col-md-9">
						<h1>Create Product</h1>
						<div className="m-1 w-75">
							<Select
								bordered={false}
								placeholder="Select a category"
								size="large"
								showSearch
								className="form-select mb-3"
								onChange={(value) => {
									setCategory(value);
								}}
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
								{photo && (
									<div className="text-center">
										<img
											src={URL.createObjectURL(photo)}
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
									onChange={(value) => {
										setShipping(value);
									}}
								>
									<Option value="0">No</Option>
									<Option value="1">Yes</Option>
								</Select>
							</div>
							<div className="mb-3">
								<button className="btn btn-primary" onClick={handleCreate}>
									CREATE PRODUCT
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default CreateProduct;
