/* This code snippet is setting up a router using the Express framework in Node.js. It requires the
'express' module, creates a router using `express.Router()`, and imports an `authController` from
the '../controllers/authController' file. */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para registrar un nuevo usuario
// POST /register
router.post('/register', authController.register);

// Ruta para iniciar sesión y obtener un JWT
// POST /login
router.post('/login', authController.login);

module.exports = router;
