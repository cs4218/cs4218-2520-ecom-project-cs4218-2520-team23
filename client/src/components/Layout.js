/* Improved by Pan Xinping, A0228445B. 
* Refactored Layout component to handle SEO metadata more robustly 
* and added default props for better maintainability.
*/

import React from "react";
import Footer from "./Footer";
import Header from "./Header";
import { Helmet } from "react-helmet";
import { Toaster } from "react-hot-toast";

const DEFAULT_SEO = {
	title: "Ecommerce app - shop now",
	description: "mern stack project",
	keywords: "mern,react,node,mongodb",
	author: "Techinfoyt",
};

const getSeoValue = (value, fallback) => {
	if (typeof value !== "string") return fallback;
	return value.trim() ? value : fallback;
};

const Layout = ({ children, title, description, keywords, author }) => {
	const resolvedTitle = getSeoValue(title, DEFAULT_SEO.title);
	const resolvedDescription = getSeoValue(description, DEFAULT_SEO.description);
	const resolvedKeywords = getSeoValue(keywords, DEFAULT_SEO.keywords);
	const resolvedAuthor = getSeoValue(author, DEFAULT_SEO.author);

	return (
		<div>
			<Helmet>
				<meta charSet="utf-8" />
				<meta name="description" content={resolvedDescription} />
				<meta name="keywords" content={resolvedKeywords} />
				<meta name="author" content={resolvedAuthor} />
				<title>{resolvedTitle}</title>
			</Helmet>
			<Header />
			<main style={{ minHeight: "70vh" }}>
				<Toaster />
				{children}
			</main>
			<Footer />
		</div>
	);
};

Layout.defaultProps = {
	title: DEFAULT_SEO.title,
	description: DEFAULT_SEO.description,
	keywords: DEFAULT_SEO.keywords,
	author: DEFAULT_SEO.author,
};

export default Layout;
