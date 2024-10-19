/* This JavaScript code snippet is setting up a route using Express.js for handling requests related to
incidents. Here's a breakdown of what each part does: */

const express = require('express');
const router = express.Router();
//Importar middlewares
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');
//Importar controladores 
const incidentController = require('../controllers/incidentController');
const userController = require('../controllers/userController');

// Ruta para obtener todos los usuarios con su sesión más reciente 
router.get('/all-users/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), userController.getAllUsersWithSessions);

// Ruta para que un administrador pueda eliminar un cliente
router.delete('/delete-customer/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), userController.deleteCustomerAccount);

// ** USUARIOS BLOQUEADOS **
// Ruta para obtener la lista de incidentes
router.get('/failed-attempts', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), incidentController.getFailedLoginAttempts);

// ** CONFIGURACION DE BLOQUEO**
// Ruta para actualizar el número máximo de intentos fallidos de login en todas las cuentas
router.put('/update-max-login-attempts', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), incidentController.updateMaxFailedLoginAttempts);

// ** CONFIGURACION DE METODOS DE VERIFIACION**
// Ruta para actualizar el tiempo de vida de los tokens
router.put('/update-token-lifetime', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), incidentController.updateTokenLifetime);

// Ruta para obtener los tiempos de vida de los tokens
router.get('/token-lifetime', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), incidentController.getConfig);
module.exports = router; 
