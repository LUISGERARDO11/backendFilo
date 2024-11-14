const cloudinary = require('../config/cloudinaryConfig');

const uploadToCloudinary = async (filePath, folder = 'company') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'auto' // Permite subir imágenes, videos, etc.
        });
        return result.secure_url; // Devuelve la URL segura del archivo subido
    } catch (error) {
        console.error('Error al subir archivo a Cloudinary:', error);
        throw new Error('Error al subir archivo a Cloudinary');
    }
};

module.exports = {
    uploadToCloudinary
};
