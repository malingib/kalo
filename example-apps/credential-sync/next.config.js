/** @type {import('next').NextConfig} */
require("dotenv").config({ path: "../../.env" });

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kalo/lib"],
};

module.exports = nextConfig;
