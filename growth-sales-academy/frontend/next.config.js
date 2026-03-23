/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        domains: ["res.cloudinary.com", "localhost"], // For future image upload storage domains
    },
};

module.exports = nextConfig;
