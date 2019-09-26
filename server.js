const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;
let bcrypt = require('bcrypt-nodejs');
const multer = require('multer');
const crypto = require('crypto');
const mime = require('mime');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
      crypto.pseudoRandomBytes(16, function (err, raw) {
        cb(null, raw.toString('hex') + Date.now() + '.' + mime.getExtension(file.mimetype));
      });
    }
  });
  const upload = multer({ storage: storage });
const fs = require('fs');
const path = require('path');
app.use('/uploads', express.static('uploads'));

const passport = require('passport');
// pass passport for configuration
require('./config/passport')(passport);


// establish connection with db
var mysql = require('mysql');
var dbconfig = require('./config/database');

var db = mysql.createConnection(dbconfig.connection);
db.connect(err => {
    if (err) {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Failed`);
    } else {
        console.log(`Connection to MYSQL Database: ${dbconfig.database} Successful`);
    }
});
db.query('USE ' + dbconfig.database);

function downloadAvatars() {
    if (fs.readdirSync( __dirname + '/uploads').length > 1) {
        return;
    }
    db.query('SELECT avatar, avatar_url FROM contact', (err, results) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(results);
        results.forEach((result) => {
            console.log(path.join(__dirname, result.avatar_url));
            fs.writeFileSync(path.join(__dirname, result.avatar_url), result.avatar);
        })
    })
}
downloadAvatars();

app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// session setup
app.use(session({
    secret: 'thecowcomesoutatmidnight',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

app.post('/login',  (req, res) => {
    passport.authenticate('local-login', {}, (err, user) => {
        if (err) {
            res.status(500).send('Internal Server Error');
            return;
        }
        if (!user) {
            res.status(401).send('Login Failed');
            return;
        }

        let sql = 'SELECT token FROM users WHERE email = ?'; 
        db.query(sql, [user.email],
            async function (err, result) {
                console.log('Result',result);
                if (err) {
                    console.log("Error");
                }
                else if (result[0].token != null)
                {
                    // if there is already a token, set sessionID to that token
                    console.log("user already has a token, assigning same token")
                    return;
                } 
                else 
                {
                    // Set the null token to the new token in user json
                    user.token = req.sessionID;
                    // Insert the session ID into the user in MySQL
                    let insertSQL = 'UPDATE users SET token = ? WHERE email = ?';

                    db.query(insertSQL, [req.sessionID, user.email], (err) => {
                        if (err) {
                            console.log("Error");
                            return;
                        } else {
                            console.log('Inserted token into db');
                            return;
                        }

                    });
                }

            });
        req.login(user, () => {
            delete user.id;
            console.log(user);
            res.status(200).send(user);
        });
    })(req,res);
});

app.post('/signup', (req, res) => {
    passport.authenticate('local-signup', {}, (err, user) => {
        if (err) {
            res.status(500).send('Internal Server Error');
            return;
        }
        if(!user) {
            res.status(400).send("Email already taken");
            return;
        }
        req.login(user, () => {
            res.status(201).send(user);
        });
    })(req,res);
});

app.get('/logout', isAuth, (req, res) => {
    console.log("logging out");
    let insertSQL = 'UPDATE users SET token = ? WHERE token = ?';
    
    db.query(insertSQL, ["", req.session.passport.user], (err) => {
        if (err) {
            console.log("Error");
            return;
        } else {
            console.log('Inserted token into db');
            return;
        }

    });
    req.logout((err) => {
        if (err)
        {
            res.status(400).send("Logged Out Failed.");
            return;
        }
    });
    console.log("logging out done");

    return res.status(200).send("Log Out Successful.");
});

// Route to create contact
app.post('/contact', isAuth, upload.single('avatar'), ({user: {id}, body: {first_name, middle_name, last_name, phone_number, address, email, note}, file}, res) => {
    if (file == undefined) {
        file = {path: "uploads/Brian.jpeg"};
    }
    let favorite = false;
    let group_id = 0;
    let sql = `INSERT INTO contact(first_name, middle_name, last_name, phone_number, address, email, favorite, note, avatar, avatar_url, group_id, user_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`;
    db.query(sql, [first_name, middle_name, last_name, phone_number, address, email, favorite, note, fs.readFileSync(file.path), file.path, group_id, id], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Internal Server Error.');
        } else {
            console.log("Contact successfully created");
            res.sendStatus(201);
        }
    });
});

// Route to get current user's contacts
app.get('/contacts', isAuth, ({user: {id: user_id}} , res) => {
    const sql = 'SELECT * FROM contact WHERE user_id = ?;';
    db.query(sql, [user_id], (err, result) => {
        if (err) {
            res.status(500).send('Internal Server Error.');
        } else {
            res.status(200).send(result.map((r) => ({...r, avatar: undefined})));
        }
    });
}); 

// Route to edit user's contacts
app.patch('/contact/:id', isAuth, upload.single('avatar'), ({user: {id: user_id}, body: {first_name, middle_name, last_name, phone_number, address, email, favorite, note, group_id} , file, params: {id}}, res) => {
    const arr = [];
    const arr2 = [];
    if (first_name) {
        arr.push('first_name = ?');
        arr2.push(first_name);
    }
    if (middle_name) {
        arr.push('middle_name = ?');
        arr2.push(middle_name);
    }
    if (last_name) {
        arr.push('last_name = ?');
        arr2.push(last_name);
    }
    if (phone_number) {
        arr.push('phone_number = ?');
        arr2.push(phone_number);
    }
    if (address) {
        arr.push('address = ?');
        arr2.push(address);
    }
    if (email) {
        arr.push('email = ?');
        arr2.push(email);
    }
    if (favorite) {
        arr.push('favorite = ?');
        arr2.push(favorite);
    }
    if (note) {
        arr.push('note = ?');
        arr2.push(note);
    }
    if (group_id) {
        arr.push('group_id = ?');
        arr2.push(group_id);
    }
    if (file) {
        arr.push('avatar = ?');
        arr2.push(fs.readFileSync(file.path));
        arr.push('avatar_url = ?')
        arr2.push(file.path);
    }
    const s = arr.join(', ');
    const sql = ('UPDATE contact set ' + s + ' WHERE user_id = ? AND id = ?;');
    db.query(sql, [...arr2, user_id, id], (err,result) => {
        if(err) {
            res.status(500).send('Internal Server Error.');
        } else {
            res.sendStatus(200);
        }
    })
})

// Route to delete user's contact
app.delete('/contact/:id', isAuth, (req , res) => {
    let id = req.params.id;
    let user_id = req.user.id;
    const sql = 'DELETE FROM contact WHERE user_id = ? AND id = ?;';
    db.query(sql, [user_id, id], (err, result) => {
        if (err) {
            res.status(500).send('Internal Server Error.')
        } else {
            res.sendStatus(200);
        }
    });
});

// Route to edit current user
app.patch('/me', isAuth, ({user: {id}, body: {first_name, last_name, email, password}}, res) => {
    const arr = [];
    const arr2 = [];
    if (first_name) {
        arr.push('first_name = ?');
        arr2.push(first_name);
    }
    if (last_name) {
        arr.push('last_name = ?');
        arr2.push(last_name);
    }
    if (email) {
        arr.push('email = ?');
        arr2.push(email);
    }
    if (password) {
        arr.push('password = ?');
        arr2.push(bcrypt.hashSync(password));
    }
    const s = arr.join(', ');
    const sql = ('UPDATE users set ' + s + ' WHERE id = ?;');
    console.log(sql, [...arr2, id]);
    const q = db.query(sql, [...arr2, id], (err,result) => {
        if(err) {
            console.log(err);
            res.status(500).send('Internal Server Error.');
        } else {
            res.sendStatus(200);
        }
    })
    console.log(q.sql);
})

// Route check auth middleware
function isAuth(req, res, next) {
    console.log("session ", req.session);
    console.log("session token", req.session.passport.user);
    if (req.isAuthenticated()) {
        // console.log("User", user);
        if (req.headers.token === req.session.passport.user)
        {
            console.log("Equal isAuth")
            return next();
        }
        else
        {
            return res.sendStatus(400);
        }
    }
}

app.listen(PORT, err => {
    if (err) {
        console.log("Port Connection Unsuccessful");
    } else {
        console.log(`Listening on port ${PORT}`);
    }
});
