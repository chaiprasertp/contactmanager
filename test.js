const request = require('request');
// request.post('http://localhost:3000/login' , {json: {
// 	"email": "hellno@hell.com",
// 	"password": "1234"
// }}, (error, res, body) => {
    request('http://localhost:3000/contacts', { json: true }, (err, res, body) => {
        if (err) { return console.log(err); 
        }
        console.log(body);
        console.log(body[0]);
    });
// });