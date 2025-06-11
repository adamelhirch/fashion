const bcrypt = require('bcryptjs');

const password = 'root'; // The password you want to hash

bcrypt.hash(password, 10).then(hash => {
  console.log('Hashed password:', hash);
}); 