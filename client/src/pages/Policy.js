import React from "react";
import Layout from "./../components/Layout";

const Policy = () => {
	const lastUpdated = "February 17, 2026"; // You can update this value
	const siteName = "Virtual Vault";

	return (
		<Layout title={"Privacy Policy"}>
			<div className="row contactus ">
				<div className="col-6 mx-auto mt-4 mb-4">
					<img src="/images/contactus.jpeg" alt="contactus" style={{ width: "100%" }} />
				</div>
				<div className="privacy-container col-10 mx-auto">
					<h1>Privacy Notice for {siteName}</h1>
					<p>
						<strong>Last Updated:</strong> {lastUpdated}
					</p>

					<p>
						At <strong>{siteName}</strong>, we know that you care how information about you is used and
						shared. We appreciate your trust that we will do so carefully and sensibly. This Privacy Notice
						describes how {siteName} collects and processes your personal information through our website
						and applications.
					</p>

					<hr style={{ margin: "10px 0", border: "0", borderTop: "1px solid #eee" }} />

					<section>
						<h2>1. Information We Collect</h2>
						<p>
							{siteName} collects your information to provide and continually improve our products and
							services.
						</p>
						<ul>
							<li>
								<strong>Information You Give Us:</strong> We receive and store any information you
								provide in relation to {siteName} services, including your name, shipping address, and
								email.
							</li>
							<li>
								<strong>Automatic Information:</strong> We automatically collect and store certain types
								of information about your use of the site, such as cookies and IP addresses.
							</li>
							<li>
								<strong>Information from Other Sources:</strong> We might receive information about you
								from third parties, such as updated delivery information from our carriers.
							</li>
						</ul>
					</section>

					<section>
						<h2>2. How We Use Your Information</h2>
						<p>
							We use your personal information to operate, provide, and improve our services, including:
						</p>
						<ul>
							<li>Purchase and delivery of products.</li>
							<li>Troubleshooting and site optimization.</li>
							<li>Personalized recommendations and interest-based ads.</li>
							<li>Communication with you via email or chat.</li>
						</ul>
					</section>

					<section>
						<h2>3. Does {siteName} Share My Information?</h2>
						<p>
							Information about our customers is a critical part of our business, and{" "}
							<strong>we are not in the business of selling it to others.</strong>
						</p>
						<ul>
							<li>
								<strong>Third-Party Transactions:</strong> We provide services or products supplied by
								third-party marketplace sellers.
							</li>
							<li>
								<strong>Service Providers:</strong> We employ other companies to perform functions on
								our behalf, such as fulfilling orders and processing payments.
							</li>
							<li>
								<strong>Business Transfers:</strong> As we grow, user information may be a transferred
								asset in a business sale or acquisition.
							</li>
						</ul>
					</section>

					<section className="mb-5">
						<h2>4. How Secure Is My Information?</h2>
						<ul>
							<li>
								We protect your data during transmission using{" "}
								<strong>Encryption protocols and software</strong>.
							</li>
							<li>
								We adhere to <strong>PCI DSS</strong> standards when handling credit card data.
							</li>
							<li>We maintain physical and electronic safeguards for all data collection and storage.</li>
						</ul>
					</section>
				</div>
			</div>
		</Layout>
	);
};

export default Policy;
