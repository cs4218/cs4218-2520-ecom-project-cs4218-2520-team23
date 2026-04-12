import React, { useState, useContext, createContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();
const EMPTY_AUTH = {
	user: null,
	token: "",
};

const parseAuthFromStorage = (value) => {
	if (!value) {
		return EMPTY_AUTH;
	}
	try {
		const parsed = JSON.parse(value);
		return {
			user: parsed?.user || null,
			token: parsed?.token || "",
		};
	} catch (error) {
		return EMPTY_AUTH;
	}
};

const AuthProvider = ({ children }) => {
	const [auth, setAuth] = useState(EMPTY_AUTH);

	useEffect(() => {
		if (auth?.token) {
			axios.defaults.headers.common["Authorization"] = auth.token;
		} else {
			delete axios.defaults.headers.common["Authorization"];
		}
	}, [auth?.token]);

	useEffect(() => {
		setAuth(parseAuthFromStorage(localStorage.getItem("auth")));
	}, []);

	useEffect(() => {
		const syncAuthFromStorage = (event) => {
			if (event.key && event.key !== "auth") {
				return;
			}
			setAuth(parseAuthFromStorage(event.newValue));
		};

		window.addEventListener("storage", syncAuthFromStorage);
		return () => {
			window.removeEventListener("storage", syncAuthFromStorage);
		};
	}, []);

	return <AuthContext.Provider value={[auth, setAuth]}>{children}</AuthContext.Provider>;
};

// custom hook
const useAuth = () => useContext(AuthContext);

export { useAuth, AuthProvider };
