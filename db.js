const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mdp123123',
  database: 'boutique'
});

db.connect(err => {
  if (err) console.log('Erreur connexion BD :', err);
  else console.log('BD connectée');
});

module.exports = db;
