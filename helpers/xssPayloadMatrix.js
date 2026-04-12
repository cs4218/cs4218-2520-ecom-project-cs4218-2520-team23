// Written by Pan Xinping, A0228445B

const maliciousTextPayloads = {
	scriptTag: "<script>alert('xss')</script>",
	imgOnError: '<img src=x onerror="alert(1)">',
	svgOnLoad: "<svg onload=alert(1)></svg>",
	iframeTag: "<iframe src=javascript:alert(1)></iframe>",
	javascriptUrl: "javascript:alert(1)",
};

const maliciousPhotoVectors = {
	svgWithScript: {
		filename: "malicious.svg",
		mimeType: "image/svg+xml",
		content: "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
	},
	htmlAsImage: {
		filename: "fake-image.jpg",
		mimeType: "text/html",
		content: "<html><body><script>alert('xss')</script></body></html>",
	},
	executableMime: {
		filename: "payload.bin",
		mimeType: "application/x-msdownload",
		content: "MZ...",
	},
};

module.exports = {
	maliciousTextPayloads,
	maliciousPhotoVectors,
};
