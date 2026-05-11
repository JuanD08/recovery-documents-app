const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db', 
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root', // Actualizado para coincidir con el docker-compose
    database: process.env.DB_NAME || 'recovery_documents_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// TEST DE CONEXIÓN INMEDIATO
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión exitosa a la base de datos MySQL (Recovery Documents)');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error crítico conectando a MySQL:', err.message);
    });

module.exports = pool;