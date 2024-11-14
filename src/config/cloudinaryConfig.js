require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Reemplaza con tu Cloud Name
  api_key: process.env.CLOUDINARY_API_KEY,       // Reemplaza con tu API Key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Reemplaza con tu API Secret
  
});

module.exports = cloudinary;