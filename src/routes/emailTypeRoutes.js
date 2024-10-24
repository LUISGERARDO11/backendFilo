/* This JavaScript code snippet is setting up a route using Express.js for handling requests related to
incidents. Here's a breakdown of what each part does: */

const express = require('express');
const router = express.Router();
//Importar middlewares
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');
//Importar controladores 
const emailTypeController = require('../controllers/emailTypeController');

// Ruta para obtener todos los usuarios con su sesión más reciente 
router.post('/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), emailTypeController.createEmailType);

// Ruta para que un administrador pueda eliminar un cliente
router.get('/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTypeController.getEmailTypeById);

// Ruta para que un administrador pueda eliminar un cliente
router.get('/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTypeController.getAllEmailTypes);

// Ruta para actualizar el número máximo de intentos fallidos de login en todas las cuentas
router.put('/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), emailTypeController.updateEmailType);

// Ruta para actualizar el número máximo de intentos fallidos de login en todas las cuentas
router.delete('/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), emailTypeController.deleteEmailType);

module.exports = router; 
