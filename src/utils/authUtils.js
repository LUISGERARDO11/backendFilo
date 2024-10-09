/* This JavaScript code defines a function named `checkPasswordRotation` that is exported using
`exports`. The function takes a parameter `fechaUltimoCambio`, which presumably represents the date
of the last password change. */
const axios = require('axios');

// Función auxiliar para verificar el estado de la rotación de contraseñas
exports.checkPasswordRotation = (fechaUltimoCambio) => {
    const seisMesesAntes = new Date();
    seisMesesAntes.setMonth(seisMesesAntes.getMonth() - 6); // Restar 6 meses (180 días)
    const warningPeriod = new Date();
    warningPeriod.setDate(warningPeriod.getDate() - 5); // Aviso si quedan 5 días o menos

    if (!fechaUltimoCambio || fechaUltimoCambio < seisMesesAntes) {
        // Si han pasado más de 6 meses, forzar el cambio de contraseña
        return { requiereCambio: true, message: 'Debes cambiar tu contraseña. Han pasado más de 6 meses.' };
    }

    if (fechaUltimoCambio < warningPeriod) {
        // Si faltan menos de 7 días para que expiren los 6 meses, enviar una advertencia
        return { requiereCambio: false, warning: true, message: 'Tu contraseña caduca pronto. Cámbiala en los próximos días.' };
    }

    // No se requiere cambio, ni advertencia
    return { requiereCambio: false, warning: false };
};
// Función para verificar si un correo electrónico es válido utilizando la API de ZeroBounce
exports.validateEmailWithZeroBounce = async (email) => {
    const apiKey = process.env.ZEROBOUNCE_API_KEY; // Clave API de ZeroBounce
    const apiUrl = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${email}`;

    try {
        // Hacer la solicitud a la API de ZeroBounce
        const response = await axios.get(apiUrl);
        const { status } = response.data;

        // Verificar si el correo es válido
        if (status === 'valid') {
            return true; // El correo es válido
        } else {
            return false; // El correo no es válido
        }
    } catch (error) {
        console.error('Error al validar el correo con ZeroBounce:', error.message);
        throw new Error('Error al validar el correo electrónico');
    }
};