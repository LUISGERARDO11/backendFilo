const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplateController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');

// Crear plantilla
router.post('/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTemplateController.createEmailTemplate);

// Obtener todas las plantillas activas
router.get('/', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, emailTemplateController.getAllEmailTemplates);

// Obtener plantilla por ID
router.get('/:templateId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, emailTemplateController.getEmailTemplateById);

// Actualizar plantilla
router.put('/:templateId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTemplateController.updateEmailTemplate);

// Eliminar plantilla (lógica)
router.delete('/:templateId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration, roleMiddleware(['administrador']), emailTemplateController.deleteEmailTemplate);

module.exports = router;
