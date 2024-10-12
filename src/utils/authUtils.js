/* This JavaScript code defines a function named `checkPasswordRotation` that is exported using
`exports`. The function takes a parameter `fechaUltimoCambio`, which presumably represents the date
of the last password change. */
const fs = require('fs');
const path = require('path');
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

exports.validateEmail =async(email) =>{
    const apiKey = process.env.MAILBOXLAYER_API_KEY; // Usa una variable de entorno para la API key
    const url = `http://apilayer.net/api/check?access_key=${apiKey}&email=${email}`;

    try {
        const response = await axios.get(url);
        const { format_valid, smtp_check, score } = response.data;

        // Comprobamos si el correo es válido según los criterios
        if (format_valid && smtp_check && score > 0.65) {
            return { isValid: true, message: 'El correo electrónico es válido.' };
        } else {
            return { isValid: false, message: 'El correo electrónico no es válido o tiene baja calidad.' };
        }
    } catch (error) {
        console.error('Error al validar el correo:', error);
        return { isValid: false, message: 'Error al validar el correo.' };
    }
}

let passwordList = new Set();

// Función para cargar la lista de contraseñas
const loadPasswordList = () => {
    const filePath = path.join(__dirname, '..', '100k-most-used-passwords-NCSC.txt');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo de contraseñas:', err);
            process.exit(1); // Salir si ocurre un error grave
        }
        // Almacena las contraseñas en un Set para búsquedas rápidas
        passwordList = new Set(data.split('\n').map(password => password.trim()));
        console.log('Lista de contraseñas cargada correctamente');
    });
};

// Función para verificar si una contraseña está comprometida
const isPasswordCompromised = (password) => {
    return passwordList.has(password);
};

module.exports = {
    loadPasswordList,
    isPasswordCompromised
};
