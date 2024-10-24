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

// Ruta para obtener crear un tipo de correo
router.post('/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), emailTypeController.createEmailType);

// Ruta para obtener un tipo de correo por su id
router.get('/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTypeController.getEmailTypeById);

// Ruta para obtener todos los tipos de email
router.get('/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTypeController.getAllEmailTypes);

// Ruta para actualizar un tipo de email (se puede cambiar uno o más campos)
router.put('/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), emailTypeController.updateEmailType);

// Ruta para eliminar lógicamente un tipo de email
router.delete('/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), emailTypeController.deleteEmailType);

module.exports = router; 
