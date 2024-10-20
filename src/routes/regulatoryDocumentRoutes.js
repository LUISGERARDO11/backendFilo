const express = require('express');
const router = express.Router();
const regulatoryDocumentController = require('../controllers/regulatoryDocumentController');
const validateRegulatoryDocument = require('../middlewares/validateRegulatoryDocument');
const authMiddleware = require('../middlewares/authMiddleware'); 
const roleMiddleware = require('../middlewares/roleMiddleware');
const tokenExpirationMiddleware = require('../middlewares/verifyTokenExpiration');

// Ruta para crear un nuevo documento regulatorio
router.post('/create', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), validateRegulatoryDocument, regulatoryDocumentController.createRegulatoryDocument);

// Ruta para actualizar un documento regulatorio
router.put('/update/:documentId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.updateRegulatoryDocument);

// Ruta para eliminar logicamente un documento regulatorio
router.delete('/delete-document/:documentId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.deleteRegulatoryDocument);

// Ruta para eliminar logicamente una version de un documento regulatorio
router.delete('/delete/:documentId/:versionToDelete', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.deleteRegulatoryDocumentVersion);

// Ruta para restaurar logicamente un documento regulatorio
router.put('/restore-document/:documentId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.restoreRegulatoryDocument);

// Ruta para restaurar logicamente una version de un documento regulatorio
router.put('/restore-version/:documentId/:versionId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.restoreRegulatoryDocumentVersion);

// Ruta para obtener el historial de versiones de un documento
router.get('/version-history/:titulo', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.getVersionHistory);

// Ruta para obtener un documento regulatorio por su id
router.get('/document/:documentId', authMiddleware, tokenExpirationMiddleware.verifyTokenExpiration,roleMiddleware(['administrador']), regulatoryDocumentController.getDocumentById);

module.exports = router;
