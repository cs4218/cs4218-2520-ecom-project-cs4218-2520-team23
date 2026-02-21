import React from "react";
import Layout from "../components/Layout";
import { BiMailSend, BiPhoneCall, BiSupport } from "react-icons/bi";

const Contact = () => {
	return (
		<Layout title={"Contact us"}>
			<div className="container contact">
				<img src="/images/contactus.png" alt="contactus" className="contact-img" />
				<h1 className="bg-dark p-2 text-white text-center">CONTACT US</h1>
				<p className="text-justify mt-2">
					For any query and help, feel free to contact us anytime. We are available 24/7.
				</p>
				<p className="mt-3" data-testid="email-contact">
					<BiMailSend aria-label="Email" title="Email" /> :{" "}
					<a href="mailto:www.help@ecommerceapp.com" data-testid="email-link">
						www.help@ecommerceapp.com
					</a>
				</p>
				<p className="mt-3" data-testid="phone-contact">
					<BiPhoneCall aria-label="Phone" title="Phone" /> : 012-3456789
				</p>
				<p className="mt-3" data-testid="support-contact">
					<BiSupport aria-label="Support" title="Support" /> : 1800-0000-0000 (toll free)
				</p>
			</div>
		</Layout>
	);
};

export default Contact;
