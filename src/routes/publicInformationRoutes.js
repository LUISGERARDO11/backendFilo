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

// Ruta para obtener la información de la empresa (público, sin seguridad)
router.get('/company/info', companyController.getCompanyInfo);

module.exports = router; 