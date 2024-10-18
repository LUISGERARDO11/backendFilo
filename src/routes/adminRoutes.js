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
const companyController = require('../controllers/companyProfileController');

// Ruta para obtener la lista de incidentes
router.get('/failed-attempts', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), incidentController.getFailedLoginAttempts);

// Ruta para que un administrador pueda eliminar un cliente
router.delete('/delete-customer/:id', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), userController.deleteCustomerAccount);

// Ruta para obtener todos los usuarios con su sesión más reciente 
router.get('/all-users/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), userController.getAllUsersWithSessions);

// Ruta para actualizar el número máximo de intentos fallidos de login en todas las cuentas
router.put('/update-max-login-attempts', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,  roleMiddleware(['administrador']), incidentController.updateMaxFailedLoginAttempts);

// Ruta para crear la información de la empresa (solo administradores)
router.post('/company/create', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.createCompany);

// Ruta para editar la información de la empresa (solo administradores)
router.put('/company/update-', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.updateCompanyInfo);

// Ruta para eliminar lógicamente la información de la empresa (solo administradores)
router.delete('/company/delete', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.deleteCompany);

// Ruta para restaurar la información de la empresa (solo administradores)
router.put('/company/restore', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.restoreCompany);

module.exports = router; 
