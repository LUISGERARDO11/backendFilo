/* This JavaScript code is setting up routes for a user profile management system using the Express
framework in Node.js. Here's a breakdown of what each part does: */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');
const userController = require('../controllers/userController');

// Ruta para obtener el perfil del usuario autenticado
// GET /profile
router.get('/profile', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, userController.getProfile);

// Ruta para actualizar el perfil del usuario autenticado
// PUT /profile
router.put('/profile', authMiddleware,tokenExpirationMiddleware.verifyTokenExpiration, userController.updateProfile);

// Ruta para actualizar la dirección del usuario autenticado
// PUT /profile
router.put('/change-address', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,userController.updateUserProfile);

// Ruta para que el cliente autenticado elimine su cuenta
//DELETE / delete-account
router.delete('/delete-account', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,userController.deleteMyAccount);
module.exports = router;
