/* This JavaScript code snippet is setting up a route using Express.js for handling requests related to
incidents. Here's a breakdown of what each part does: */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const incidentController = require('../controllers/incidentController');

// Ruta para obtener la lista de incidentes
// GET /incidents
router.get('/failed-attempts', authMiddleware, roleMiddleware(['administrador']), incidentController.getFailedLoginAttempts);
;

module.exports = router;
