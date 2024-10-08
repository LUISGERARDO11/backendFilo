/* This JavaScript code is setting up routes for a user profile management system using the Express
framework in Node.js. Here's a breakdown of what each part does: */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

// Ruta para obtener el perfil del usuario autenticado
// GET /profile
router.get('/profile', authMiddleware, userController.getProfile);

// Ruta para actualizar el perfil del usuario autenticado
// PUT /profile
router.put('/profile', authMiddleware, userController.updateProfile);

// Ruta para actualizar la contraseña del usuario autenticado
// PUT /change.profile
router.put('/change-password', authMiddleware, userController.changePassword);
module.exports = router;
