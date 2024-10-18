const Company = require('../models/Company');
const { body, validationResult } = require('express-validator');
const loggerUtils = require('../utils/loggerUtils');

// Crear nueva empresa
exports.createCompany = [
    // Validar y sanitizar las entradas
    body('nombre').isString().trim().escape().withMessage('El nombre es requerido.'),
    body('logo').optional().isString().trim().escape().withMessage('El logo debe ser una URL válida.'),
    body('slogan').optional().isString().trim().escape().withMessage('El eslogan debe ser un texto válido.'),
    body('direccion.calle').optional().isString().trim().escape().withMessage('La calle debe ser un texto válido.'),
    body('direccion.ciudad').optional().isString().trim().escape().withMessage('La ciudad debe ser un texto válido.'),
    body('direccion.estado').optional().isString().trim().escape().withMessage('El estado debe ser un texto válido.'),
    body('direccion.codigo_postal').optional().isString().trim().escape().withMessage('El código postal debe ser un texto válido.'),
    body('direccion.pais').optional().isString().trim().escape().withMessage('El país debe ser un texto válido.'),
    body('telefono.numero').optional().isString().trim().escape().withMessage('El número de teléfono debe ser válido.'),
    body('telefono.extension').optional().isString().trim().escape().withMessage('La extensión debe ser un número válido.'),
    body('email').isEmail().normalizeEmail().withMessage('El correo electrónico es obligatorio y debe ser válido.'),
    body('redes_sociales.facebook').optional().isURL().withMessage('La URL de Facebook debe ser válida.'),
    body('redes_sociales.twitter').optional().isURL().withMessage('La URL de Twitter debe ser válida.'),
    body('redes_sociales.linkedin').optional().isURL().withMessage('La URL de LinkedIn debe ser válida.'),
    body('redes_sociales.instagram').optional().isURL().withMessage('La URL de Instagram debe ser válida.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre, logo, slogan, direccion, telefono, email, redes_sociales } = req.body;

        try {
            // Verificar si ya existe una empresa
            const existingCompany = await Company.findOne();
            if (existingCompany) {
                return res.status(400).json({ message: 'La información de la empresa ya existe.' });
            }

            // Crear una nueva empresa
            const newCompany = new Company({
                nombre,
                logo,
                slogan,
                direccion,
                telefono,
                email,
                redes_sociales
            });

            // Guardar la empresa en la base de datos
            const savedCompany = await newCompany.save();

            // Registrar la actividad de creación de la empresa
            loggerUtils.logUserActivity(req.user ? req.user._id : 'admin', 'create', 'Empresa creada exitosamente.');

            // Responder con éxito
            res.status(201).json({ message: 'Empresa creada exitosamente.', company: savedCompany });
        } catch (error) {
            loggerUtils.logCriticalError(error);
            res.status(500).json({ message: 'Error al crear la empresa.', error: error.message });
        }
    }
];


// Actualizar la información de la empresa
exports.updateCompanyInfo = [
    // Validar y sanitizar las entradas
    body('nombre').optional().isString().trim().escape().withMessage('El nombre debe ser un texto válido.'),
    body('logo').optional().isString().trim().escape().withMessage('El logo debe ser una URL válida.'),
    body('slogan').optional().isString().trim().escape().withMessage('El eslogan debe ser un texto válido.'),
    body('direccion.calle').optional().isString().trim().escape().withMessage('La calle debe ser un texto válido.'),
    body('direccion.ciudad').optional().isString().trim().escape().withMessage('La ciudad debe ser un texto válido.'),
    body('direccion.estado').optional().isString().trim().escape().withMessage('El estado debe ser un texto válido.'),
    body('direccion.codigo_postal').optional().isString().trim().escape().withMessage('El código postal debe ser un texto válido.'),
    body('direccion.pais').optional().isString().trim().escape().withMessage('El país debe ser un texto válido.'),
    body('telefono.numero').optional().isString().trim().escape().withMessage('El número de teléfono debe ser válido.'),
    body('telefono.extension').optional().isString().trim().escape().withMessage('La extensión debe ser un número válido.'),
    body('email').optional().isEmail().normalizeEmail().withMessage('El correo electrónico debe ser válido.'),
    body('redes_sociales.facebook').optional().isURL().withMessage('La URL de Facebook debe ser válida.'),
    body('redes_sociales.twitter').optional().isURL().withMessage('La URL de Twitter debe ser válida.'),
    body('redes_sociales.linkedin').optional().isURL().withMessage('La URL de LinkedIn debe ser válida.'),
    body('redes_sociales.instagram').optional().isURL().withMessage('La URL de Instagram debe ser válida.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre, logo, slogan, direccion, telefono, email, redes_sociales } = req.body;

        try {
            // Buscar la información de la empresa
            const companyInfo = await Company.findOne();

            if (!companyInfo) {
                return res.status(404).json({ message: 'La información de la empresa no se encontró.' });
            }

            // Actualizar los campos con los valores proporcionados en la solicitud
            if (nombre) companyInfo.nombre = nombre;
            if (logo) companyInfo.logo = logo;
            if (slogan) companyInfo.slogan = slogan;
            if (direccion) companyInfo.direccion = { ...companyInfo.direccion, ...direccion };
            if (telefono) companyInfo.telefono = { ...companyInfo.telefono, ...telefono };
            if (email) companyInfo.email = email;
            if (redes_sociales) companyInfo.redes_sociales = { ...companyInfo.redes_sociales, ...redes_sociales };

            // Guardar los cambios en la base de datos
            const updatedCompany = await companyInfo.save();

            // Registrar la actividad de actualización
            loggerUtils.logUserActivity(req.user ? req.user._id : 'admin', 'update', 'Información de la empresa actualizada exitosamente.');

            // Responder con éxito
            res.status(200).json({ message: 'Información de la empresa actualizada exitosamente.', company: updatedCompany });
        } catch (error) {
            loggerUtils.logCriticalError(error);
            res.status(500).json({ message: 'Error al actualizar la información de la empresa.', error: error.message });
        }
    }
];

// Obtener la información de la empresa
exports.getCompanyInfo = async (req, res) => {
    try {
        // Buscar la información de la empresa donde esté activa, pero excluir el campo 'activo' en la respuesta
        const companyInfo = await Company.findOne({ activo: true }).select('-activo');

        if (!companyInfo) {
            return res.status(404).json({ message: 'La información de la empresa no se encontró.' });
        }
        // Devolver la información de la empresa
        res.status(200).json({ company: companyInfo });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al obtener la información de la empresa.', error: error.message });
    }
};

//Borrado lógico de la informacion de la empresa (marcarlo como inactivo)
exports.deleteCompany = async (req, res) => {
    try {
        // Buscar la empresa en la base de datos
        const company = await Company.findOne();

        if (!company) {
            return res.status(404).json({ message: 'La empresa no se encontró.' });
        }

        // Marcar como "inactivo" en lugar de eliminar
        company.activo = false;

        await company.save();

        // Registrar la actividad del usuario
        loggerUtils.logUserActivity(req.user ? req.user._id : 'admin', 'delete', 'Información de la empresa marcada como eliminada.');

        res.status(200).json({ message: 'La empresa ha sido eliminada lógicamente.' });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al eliminar la empresa.', error: error.message });
    }
};
//Deshacer el borrado de la informacion de la compañia (activarlo)
exports.restoreCompany = async (req, res) => {
    try {
        // Buscar la empresa que esté inactiva
        const company = await Company.findOne({ activo: false });

        if (!company) {
            return res.status(404).json({ message: 'No se encontró una empresa inactiva para restaurar.' });
        }

        // Cambiar el estado de la empresa a "activa"
        company.activo = true;
        await company.save();

        // Registrar la actividad de restauración en los logs
        loggerUtils.logUserActivity(req.user ? req.user._id : 'admin', 'restore', 'Información de la empresa restaurada.');

        res.status(200).json({ message: 'La empresa ha sido restaurada exitosamente.' });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al restaurar la empresa.', error: error.message });
    }
};