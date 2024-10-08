/* This JavaScript code snippet is setting up a route using Express.js for handling requests related to
incidents. Here's a breakdown of what each part does: */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration'); 
const incidentController = require('../controllers/incidentController');
const userController = require('../controllers/userController');

// Ruta para obtener la lista de incidentes
// GET /incidents    deleteCustomerAccount
router.get('/failed-attempts', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), incidentController.getFailedLoginAttempts);

// Ruta para que un administrador pueda eliminar un cliente
// delete /delete-customer:id
router.delete('/delete-customer/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), userController.deleteCustomerAccount);

// Ruta para obtener todos los usuarios con su sesión más reciente 
// GET /delete-customer:id
router.get('/all-users/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), userController.getAllUsersWithSessions);
module.exports = router; 
