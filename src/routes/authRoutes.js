/* This code snippet is setting up a router using the Express framework in Node.js. It requires the
'express' module, creates a router using `express.Router()`, and imports an `authController` from
the '../controllers/authController' file. */

const express = require('express');
const router = express.Router();
const { doubleCsrfProtection } = require('../config/csrfConfig');
//Importar controladores
const authController = require('../controllers/authController');
//Importar middlewares
const authMiddleware = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/expressRateLimit');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');

// Ruta para verificar si una contraseña está comprometida
router.post('/check-password', authController.checkPassword);

// Ruta para registrar un nuevo usuario
router.post('/register', authLimiter, authController.register);

// Ruta para registrar que un usuario verifique su cuenta/email
router.get('/verify-email', authController.verifyEmailVersion2);

// Ruta para iniciar sesión y obtener un JWT
router.post('/login', authController.login);

// Ruta para hacer check de autentificacion
router.post('/checkAuth', authController.checkAuth);

// Ruta para enviar el OTP al correo del usuario para MFA
router.post('/mfa/send-otp', authController.sendOtpMfa);

// Ruta para verificar el código OTP del MFA
router.post('/mfa/verify-otp', authController.verifyOTPMFA);

// Ruta para cerrar sesión 
router.post('/logout', authMiddleware, authController.logout)

// Ruta para actualizar la contraseña del usuario autenticado
router.put('/change-password', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,authController.changePassword);

// Ruta para iniciar el proceso de recuperación de contraseña
router.post('/initiate-password-recovery', authController.initiatePasswordRecovery);

// Ruta para verificar el código OTP
router.post('/verify-otp', authController.verifyOTP);

// Ruta para reestablecer la contraseña
router.post('/reset-password', authController.resetPassword);

module.exports = router;