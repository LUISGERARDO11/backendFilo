const cloudinary = require('../config/cloudinaryConfig');

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
      if (error) {
        console.error('Error al subir archivo a Cloudinary:', error);
        return reject(error);
      }
      resolve(result.secure_url); // Asegúrate de que `secure_url` sea el valor correcto.
    });
    uploadStream.end(fileBuffer);
  });
};

module.exports = { uploadToCloudinary };
