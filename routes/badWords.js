var express = require('express');
var router = express.Router();
var sql = require('mssql')
var badWordsList = []
const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE ;
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
async function fetchBadWords() {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        const sqlQuery = 'SELECT palabra FROM malasPalabras';
        const result = await request.query(sqlQuery);
        badWordsList = result.recordset.map(row => row.palabra);
        return result.recordset;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}
fetchBadWords()
    .then(badWordsList => {
        console.log('Lista de malas palabras:', badWordsList);
    })
    .catch(error => {
        console.error('Error al obtener la lista de malas palabras:', error);
    });

router.get('/', async (req, res) => {
    try {
        if (badWordsList !== null) {
            res.json(badWordsList);
        } else {
            const badWords = await fetchBadWords();
            res.json(badWords);
        }
    } catch (err) {
        res.status(500).send('Error fetching bad words');
    }
});
function quitarTildes(texto) {
    return texto.normalize('NFD')
        .replace(/([aeio])\u0301|(u)[\u0301\u0308]/gi, "$1$2")
        .normalize();
}

function eliminarSes(texto) {
    let resultado = texto.replace(/\b(\w+)es\b/g, '$1');
    resultado = resultado.replace(/\b(\w+)s\b/g, '$1');
    return resultado;
}

function NLP(str) {
    const stringWithoutDiacritics = quitarTildes(str).replace(/[\,^*@!"#$%&/()=?¡!¿'\\]/gi, '').toLowerCase();
    const cleanedString = eliminarSes(stringWithoutDiacritics);
    const tokens = cleanedString.split(/\s+/);
    return tokens;
}
    
function jaccardSimilarity(str, wordVector) {  
    const set1 = str;
    const set2 = new Set([...wordVector].map(word => word));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const similarity = intersection.size / union.size;
    return similarity;
}

function cosineSimilarity(str, wordVector) {
    const set1 = new Set([...str].map(word => word));;
    const set2 = new Set([...wordVector].map(word => word));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const magnitude1 = Math.sqrt(set1.size);
    const magnitude2 = Math.sqrt(set2.size);
    const dotProduct = intersection.size;
    const similarity = dotProduct / (magnitude1 * magnitude2);
    return similarity;
}

router.post('/', async (req, res) => {
    const Deseo = req.body.deseo;
    const Deseo_NLP = Array.from(NLP(Deseo));
    const resultJaccard = jaccardSimilarity(Deseo_NLP, badWordsList);
    const resultCosseno = cosineSimilarity(Deseo_NLP, badWordsList);
    console.log(resultCosseno)
    console.log(resultJaccard)
    if (resultJaccard > 0 || resultCosseno > 0) {
        res.json(false);
    } else {
        try {
            await sql.connect(config);
            const request = new sql.Request();
            const sqlQuery = 'INSERT INTO deseos (deseo) VALUES (@Deseo)';
            await request.input('Deseo', sql.VarChar, Deseo).query(sqlQuery);
            res.json(true);
        } catch (err) {
            console.error(err.message);
            res.json(err.message);
        }
    }
});

module.exports = router;