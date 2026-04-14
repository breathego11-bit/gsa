/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        domains: ["res.cloudinary.com", "localhost", "vz-2fecc26c-20b.b-cdn.net"],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '1gb',
        },
    },
};

module.exports = nextConfig;
