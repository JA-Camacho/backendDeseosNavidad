var express = require('express');
var router = express.Router();
var sql = require('mssql')
const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const user = process.env.AZURE_SQL_USERNAME;
const password = process.env.AZURE_SQL_PASSWORD;
const config = {
    server,
    port,
    database,
    user,
    password,
    options: {
       encrypt: true
    }
};


async function sugerencias() {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        const sqlQuery = 'SELECT * FROM sugerencias';
        const result = await request.query(sqlQuery);
        console.log(result)
        return result.recordset;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

router.get('/', async (req, res) => {
    try {
        const Sugerencias = await sugerencias();
        res.json(Sugerencias);
     } catch (err) {
        res.status(500).send('Error fetching sugerencias');
     }
    });

router.post('/', async (req, res) => {
    let Sugerencia = req.body.sugerencia; 
    try {
        await sql.connect(config);
        const request = new sql.Request();
        const sqlQuery = 'INSERT INTO sugerencias (sugerencia) VALUES (@Sugerencia)';
        await request.input('Sugerencia', sql.VarChar, Sugerencia).query(sqlQuery); // Corregido el nombre de la variable
        res.json(true);
    } catch (err) {
        console.error(err.message);
        res.json(err.message);
    }
});


module.exports = router;