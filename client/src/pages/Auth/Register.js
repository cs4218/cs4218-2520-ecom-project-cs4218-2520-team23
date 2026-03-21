// Improved by Dong Cheng-Yu, A0262348B
import React, { useState, useEffect } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";
const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [answer, setAnswer] = useState("");
  const navigate = useNavigate();
  const [auth] = useAuth();

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    const parsedAuth = storedAuth ? JSON.parse(storedAuth) : null;
    const hasToken = auth?.token || parsedAuth?.token;
    if (hasToken) {
      navigate("/", { replace: true });
    }
  }, [auth?.token, navigate]);
  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    const normalizedAddress = address.trim();
    const normalizedAnswer = answer.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d+$/;
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password ||
      !normalizedPhone ||
      !normalizedAddress ||
      !DOB ||
      !normalizedAnswer
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      toast.error(
        "Please enter a valid email address, it should be in the form of example@example.com",
      );
      return;
    }

    if (!phoneRegex.test(normalizedPhone)) {
      toast.error("Phone must be numbers only");
      return;
    }

    if (!dobRegex.test(DOB) || Number.isNaN(Date.parse(DOB))) {
      toast.error("Please enter a valid date of birth");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dobDate = new Date(DOB);

    if (dobDate > today) {
      toast.error("Date of birth cannot be in the future");
      return;
    }

    try {
      const res = await axios.post("/api/v1/auth/register", {
        name: normalizedName,
        email: normalizedEmail,
        password,
        phone: normalizedPhone,
        address: normalizedAddress,
        DOB,
        answer: normalizedAnswer,
      });
      if (res?.data?.success) {
        toast.success("Register Successfully, please login");
        navigate("/login");
      } else {
        toast.error(res?.data?.message || "Registration failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Layout title="Register - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit} noValidate>
          <h4 className="title">REGISTER FORM</h4>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              id="exampleInputName1"
              placeholder="Enter Your Name"
              required
              autoFocus
            />
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              id="exampleInputPassword1"
              placeholder="Enter Your Password"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-control"
              id="exampleInputPhone1"
              placeholder="Enter Your Phone"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-control"
              id="exampleInputaddress1"
              placeholder="Enter Your Address"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="date"
              value={DOB}
              onChange={(e) => setDOB(e.target.value)}
              className="form-control"
              id="exampleInputDOB1"
              data-testid="dob-input"
              placeholder="Enter Your DOB"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="What is Your Favorite sports"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            REGISTER
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
