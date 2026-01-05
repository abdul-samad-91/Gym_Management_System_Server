import cloudinary from "cloudinary";

import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// console.log("Cloudinary config", {
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_API_KEY ? "OK" : "MISSING",
//   api_secret: process.env.CLOUD_API_SECRET ? "OK" : "MISSING"
// });

export default cloudinary.v2;
