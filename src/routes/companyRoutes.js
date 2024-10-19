const express = require('express');
const router = express.Router();
//Importar middlewares
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');
//Importar controladores 
const companyController = require('../controllers/companyProfileController');


// Ruta para crear la información de la empresa (solo administradores)
router.post('/create', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.createCompany);

// Ruta para editar la información de la empresa (solo administradores)
router.put('/update', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.updateCompanyInfo);

// Ruta para eliminar links de redes sociales de la empresa (solo administradores)
router.put('/delete-social-media-links', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.deleteSocialMediaLinks);

// Ruta para eliminar lógicamente la información de la empresa (solo administradores)
router.delete('/delete', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.deleteCompany);

// Ruta para restaurar la información de la empresa (solo administradores)
router.put('/restore', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), companyController.restoreCompany);

module.exports = router; 