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
        req.login(user, () => {
            res.status(200).send(user);
        });
    })(req,res);
});

app.post('/signup', (req, res) => {
    passport.authenticate('local-signup', {}, (err, user) => {
        if (err) {
            res.status(500).send('Internal Server Error');
        }
        req.login(user, () => {
            res.status(201).send(user);
        });
    })(req,res);
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

// Route to create contact
app.post('/contact', isAuth, upload.single('avatar'), ({user: {id}, body: {first_name, middle_name, last_name, phone_number, address, email, note}, file}, res) => {
    console.log(Object.keys(file), file.destination, file.path, file.filename);
    console.log(fs.readFileSync(file.path));
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
app.patch('/contact/:id', isAuth, ({user: {id: user_id}, body: {first_name, middle_name, last_name, phone_number, address, email, favorite, note, group_id}, params: {id}}, res) => {
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
    if (req.isAuthenticated()) {
        return next();
    }
    // if not valid user session, go to login page
    res.redirect('/login');
}

app.listen(PORT, err => {
    if (err) {
        console.log("Port Connection Unsuccessful");
    } else {
        console.log(`Listening on port ${PORT}`);
    }
});