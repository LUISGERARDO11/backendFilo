/* This JavaScript code defines a function named `checkPasswordRotation` that is exported using
`exports`. The function takes a parameter `fechaUltimoCambio`, which presumably represents the date
of the last password change. */

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
