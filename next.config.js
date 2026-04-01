/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        domains: ["res.cloudinary.com", "localhost"],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '500mb',
        },
    },
};

module.exports = nextConfig;
