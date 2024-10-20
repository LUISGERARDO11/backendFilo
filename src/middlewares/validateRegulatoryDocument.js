const { body, validationResult } = require('express-validator');

const validateRegulatoryDocument = [
  // Validar el título
  body('titulo')
    .isString().withMessage('El título debe ser un texto válido.')
    .trim().escape().notEmpty().withMessage('El título es obligatorio.'),
  
  // Validar el contenido
  body('contenido')
    .isString().withMessage('El contenido debe ser un texto válido.')
    .notEmpty().withMessage('El contenido es obligatorio.'),
  
  // Validar la fecha de vigencia
  body('fecha_vigencia')
    .optional()
    .isISO8601().withMessage('La fecha de vigencia debe ser una fecha válida (ISO 8601).'),
  
  // Validar el tipo de documento regulatorio
  body('tipo_documento')
    .isIn(['Política de privacidad', 'Términos y condiciones', 'Deslinde legal'])
    .withMessage('El tipo de documento regulatorio debe ser válido (Política de privacidad, Términos y condiciones, Deslinde legal).'),

  // Manejar los errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = validateRegulatoryDocument;
