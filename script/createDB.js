var mysql = require('mysql');
var dbconfig = require('../config/database');

var db = mysql.createConnection(dbconfig.connection);
db.connect(err => {
    if (err) {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Failed`);
    } else {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Successful`);
    }
});
db.query('USE ' + dbconfig.database);


let sql = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
	email VARCHAR(100) NOT NULL UNIQUE,
	password VARCHAR(255)
);`;

let sql2 = `CREATE TABLE IF NOT EXISTS contact (
	id INT AUTO_INCREMENT PRIMARY KEY,
	first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(50),
	phone_number VARCHAR(15),
    email VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(200),
    favorite BOOLEAN DEFAULT FALSE,
    profile_url VARCHAR(1000),
    group_id INT,
    user_id INT,
	FOREIGN KEY (user_id) REFERENCES users(id)
);`;

db.query(
    sql, (err, result) => {
        if (err) {
            throw err;
        } else {
            console.log("SUCCESS");
        }
    });

db.query(
    sql2, (err, result) => {
        if (err) {
            throw err;
        } else {
            console.log("SUCCESS");
        }
    });
console.log('Success: Database Created!')

db.end();