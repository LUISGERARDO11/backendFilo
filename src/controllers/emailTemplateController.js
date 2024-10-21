const { body, validationResult } = require('express-validator');
const EmailTemplate = require('../models/EmailTemplate');
const loggerUtils = require('../utils/loggerUtils');

//Crea una nueva plantilla de email con su nombre, tipo de email, asunto, contenido (HTML y texto plano), y variables dinámicas.
exports.createEmailTemplate = [
  // Validar entradas
  body('nombre').isString().trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('tipo').isMongoId().withMessage('El tipo de email debe ser un ID válido.'),
  body('asunto').isString().trim().notEmpty().withMessage('El asunto es obligatorio.'),
  body('contenido_html').isString().trim().notEmpty().withMessage('El contenido HTML es obligatorio.'),
  body('contenido_texto').isString().trim().notEmpty().withMessage('El contenido en texto plano es obligatorio.'),
  body('variables').isArray().withMessage('Las variables deben ser un array.'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, tipo, asunto, contenido_html, contenido_texto, variables } = req.body;

    try {
      // Verificar si ya existe una plantilla con el mismo nombre
      const existingTemplate = await EmailTemplate.findOne({ nombre });
      if (existingTemplate) {
        return res.status(400).json({ message: 'Ya existe una plantilla con ese nombre.' });
      }

      // Crear la plantilla
      const newEmailTemplate = new EmailTemplate({
        nombre,
        tipo,
        asunto,
        contenido_html,
        contenido_texto,
        variables,
        creado_por: req.user.user_id
      });

      const savedTemplate = await newEmailTemplate.save();
      loggerUtils.logUserActivity(req.user.user_id, 'create', `Plantilla de email creada: ${nombre}.`);

      res.status(201).json({ message: 'Plantilla creada exitosamente.', template: savedTemplate });
    } catch (error) {
      loggerUtils.logCriticalError(error);
      res.status(500).json({ message: 'Error al crear la plantilla.', error: error.message });
    }
  }
];
//Obtiene todas las plantillas de email, excluyendo aquellas que estén desactivadas
exports.getAllEmailTemplates = async (req, res) => {
    try {
      // Obtener solo plantillas activas
      const templates = await EmailTemplate.find({ activo: true }).populate('tipo', 'nombre codigo');
      res.status(200).json(templates);
    } catch (error) {
      loggerUtils.logCriticalError(error);
      res.status(500).json({ message: 'Error al obtener las plantillas de email.', error: error.message });
    }
};
//Obtiene una plantilla de email por su ID.
exports.getEmailTemplateById = async (req, res) => {
    const { templateId } = req.params;
  
    try {
      // Buscar la plantilla por ID
      const template = await EmailTemplate.findById(templateId).populate('tipo', 'nombre codigo');
  
      if (!template || !template.activo) {
        return res.status(404).json({ message: 'Plantilla no encontrada o ha sido desactivada.' });
      }
  
      res.status(200).json(template);
    } catch (error) {
      loggerUtils.logCriticalError(error);
      res.status(500).json({ message: 'Error al obtener la plantilla de email.', error: error.message });
    }
};
// Actualiza una plantilla de email existente.
exports.updateEmailTemplate = [
    // Validar entradas
    body('nombre').optional().isString().trim().notEmpty().withMessage('El nombre debe ser un texto válido.'),
    body('tipo').optional().isMongoId().withMessage('El tipo de email debe ser un ID válido.'),
    body('asunto').optional().isString().trim().notEmpty().withMessage('El asunto es obligatorio.'),
    body('contenido_html').optional().isString().trim().notEmpty().withMessage('El contenido HTML es obligatorio.'),
    body('contenido_texto').optional().isString().trim().notEmpty().withMessage('El contenido en texto plano es obligatorio.'),
    body('variables').optional().isArray().withMessage('Las variables deben ser un array.'),
  
    async (req, res) => {
      const { templateId } = req.params;
      const { nombre, tipo, asunto, contenido_html, contenido_texto, variables } = req.body;
  
      try {
        // Buscar la plantilla por ID
        const template = await EmailTemplate.findById(templateId);
  
        if (!template || !template.activo) {
          return res.status(404).json({ message: 'Plantilla no encontrada o ha sido desactivada.' });
        }
  
        // Actualizar los campos si fueron proporcionados
        if (nombre) template.nombre = nombre;
        if (tipo) template.tipo = tipo;
        if (asunto) template.asunto = asunto;
        if (contenido_html) template.contenido_html = contenido_html;
        if (contenido_texto) template.contenido_texto = contenido_texto;
        if (variables) template.variables = variables;
        template.actualizado_por = req.user.user_id;
  
        const updatedTemplate = await template.save();
        loggerUtils.logUserActivity(req.user.user_id, 'update', `Plantilla de email actualizada: ${updatedTemplate.nombre}.`);
  
        res.status(200).json({ message: 'Plantilla actualizada exitosamente.', template: updatedTemplate });
      } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al actualizar la plantilla.', error: error.message });
      }
    }
];
//Realiza una eliminación lógica de la plantilla de email, cambiando el estado a activo: false.
exports.deleteEmailTemplate = async (req, res) => {
    const { templateId } = req.params;
  
    try {
      // Buscar la plantilla por ID
      const template = await EmailTemplate.findById(templateId);
  
      if (!template || !template.activo) {
        return res.status(404).json({ message: 'Plantilla no encontrada o ya ha sido eliminada.' });
      }
  
      // Marcar como eliminada (activo = false)
      template.activo = false;
      template.actualizado_por = req.user.user_id;
  
      await template.save();
      loggerUtils.logUserActivity(req.user.user_id, 'delete', `Plantilla de email eliminada: ${template.nombre}.`);
  
      res.status(200).json({ message: 'Plantilla eliminada lógicamente.' });
    } catch (error) {
      loggerUtils.logCriticalError(error);
      res.status(500).json({ message: 'Error al eliminar la plantilla.', error: error.message });
    }
};
  