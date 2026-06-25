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
    // El type-check + lint ya corren en CI (`tsc --noEmit`) antes del deploy. Saltarlos en
    // el `next build` evita el OOM al compilar la imagen en el VPS (esa fase consume ~2GB+).
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
