const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Android envía el token en el header de 'Authorization'
    const token = req.header('Authorization');
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        // Limpiamos el token por si Android le pone la palabra "Bearer "
        const tokenLimpio = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        
        // Verificamos si es válido con la clave secreta del docker-compose.yml
        const verified = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        req.user = verified;
        
        // Todo en orden, puede seguir a la ruta
        next(); 
    } catch (error) {
        res.status(400).json({ error: 'Token no válido o ha expirado.' });
    }
};

// ESTA LÍNEA ES VITAL PARA QUE APP.JS NO ESTALLE
module.exports = verifyToken;