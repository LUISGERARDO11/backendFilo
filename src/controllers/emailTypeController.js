const EmailType = require('../models/EmailType');
const { body, validationResult } = require('express-validator');
const loggerUtils = require('../utils/loggerUtils');

// Método para crear un nuevo tipo de email
exports.createEmailType = [
  // Validaciones de entrada
  body('codigo').isString().trim().notEmpty().withMessage('El código es obligatorio.'),
  body('nombre').isString().trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('variables_requeridas').isArray().withMessage('Las variables requeridas deben ser un array.'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      loggerUtils.logCriticalError(new Error('Errores de validación al crear el tipo de email.'));
      return res.status(400).json({ errors: errors.array() });
    }

    const { codigo, nombre, descripcion, variables_requeridas } = req.body;

     // **Verificar que req.user._id tiene el ID del usuario**
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ message: 'Usuario no autenticado.' });
    }
    
    try {
      // Verificar si el código ya existe
      const existingType = await EmailType.findOne({ codigo });
      if (existingType) {
        loggerUtils.logUserActivity(req.user._id, 'create', 'Intento de crear un tipo de email con código duplicado.');
        return res.status(400).json({ message: 'El código del tipo de email ya existe.' });
      }

      // Crear un nuevo tipo de email
      const newEmailType = new EmailType({
        codigo,
        nombre,
        descripcion,
        variables_requeridas,
        creado_por: req.user.user_id // El ID del usuario autenticado que lo creó
      });

      // Guardar en la base de datos
      const savedEmailType = await newEmailType.save();

      // Registrar la creación en el logger
      loggerUtils.logUserActivity(req.user.user_id, 'create', `Tipo de email creado: ${codigo} - ${nombre}.`);

      res.status(201).json({ message: 'Tipo de email creado exitosamente.', emailType: savedEmailType });
    } catch (error) {
      loggerUtils.logCriticalError(error);
      res.status(500).json({ message: 'Error al crear el tipo de email.', error: error.message });
    }
  }
];
// Método para obtener un tipo de email por su ID
exports.getEmailTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const emailType = await EmailType.findById(id);
    if (!emailType) {
      loggerUtils.logUserActivity(req.user.user_id, 'view', `Intento fallido de obtener tipo de email por ID: ${id}.`);
      return res.status(404).json({ message: 'Tipo de email no encontrado.' });
    }
    
    // Registrar el acceso a la información
    loggerUtils.logUserActivity(req.user.user_id, 'view', `Obtenido tipo de email: ${emailType.nombre}.`);
    
    res.status(200).json({ emailType });
  } catch (error) {
    loggerUtils.logCriticalError(error);
    res.status(500).json({ message: 'Error al obtener el tipo de email.', error: error.message });
  }
};
// Método para obtener todos los tipos de email
exports.getAllEmailTypes = async (req, res) => {
  try {
    const emailTypes = await EmailType.find({ activo: true }); // Solo tipos de email activos
    
    // Registrar el acceso a la información
    loggerUtils.logUserActivity(req.user.user_id, 'view', 'Obtenidos todos los tipos de email activos.');
    
    res.status(200).json({ emailTypes });
  } catch (error) {
    loggerUtils.logCriticalError(error);
    res.status(500).json({ message: 'Error al obtener los tipos de email.', error: error.message });
  }
};
// Método para actualizar un tipo de email por su ID
exports.updateEmailType = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, descripcion, variables_requeridas } = req.body;

  try {
    // Buscar y actualizar el tipo de email
    const updatedEmailType = await EmailType.findByIdAndUpdate(
      id,
      { codigo, nombre, descripcion, variables_requeridas, actualizado_por: req.user.user_id },
      { new: true } // Devuelve el documento actualizado
    );

    if (!updatedEmailType) {
      loggerUtils.logUserActivity(req.user.user_id, 'update', `Intento fallido de actualizar tipo de email por ID: ${id}.`);
      return res.status(404).json({ message: 'Tipo de email no encontrado.' });
    }

    // Registrar la actualización en el logger
    loggerUtils.logUserActivity(req.user.user_id, 'update', `Tipo de email actualizado: ${codigo} - ${nombre}.`);

    res.status(200).json({ message: 'Tipo de email actualizado exitosamente.', emailType: updatedEmailType });
  } catch (error) {
    loggerUtils.logCriticalError(error);
    res.status(500).json({ message: 'Error al actualizar el tipo de email.', error: error.message });
  }
};
exports.deleteEmailType = async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar y marcar como inactivo (eliminación lógica)
    const deletedEmailType = await EmailType.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    );

    if (!deletedEmailType) {
      loggerUtils.logUserActivity(req.user.user_id, 'delete', `Intento fallido de eliminar tipo de email por ID: ${id}.`);
      return res.status(404).json({ message: 'Tipo de email no encontrado.' });
    }

    // Registrar la eliminación en el logger
    loggerUtils.logUserActivity(req.user.user_id, 'delete', `Tipo de email eliminado: ${deletedEmailType.codigo} - ${deletedEmailType.nombre}.`);

    res.status(200).json({ message: 'Tipo de email eliminado exitosamente.' });
  } catch (error) {
    loggerUtils.logCriticalError(error);
    res.status(500).json({ message: 'Error al eliminar el tipo de email.', error: error.message });
  }
};
