const bcrypt = require('bcrypt');

const db = require('../config/db');

const tokenUtils = require('../utils/tokenUtils');

// queries
const queryFindUserByEmail = 'SELECT * FROM users WHERE email = ?;';
const queryAddUser =
  'INSERT INTO users (username,email,password) VALUES (?,?,?)';

const signup = async (req, res) => {
  const { username, email, password } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const conn = await db.getConnection();
    const [users] = await conn.query(queryFindUserByEmail, [email]);

    if (users[0]) {
      conn.end();
      return res.json({
        success: false,
        error: 'email already registered',
      });
    }

    let infoForToken = {
      username: username,
      email: email,
      passwordHash: passwordHash,
    };
    const token = tokenUtils.generate(infoForToken);

    const [newUser] = await conn.query(queryAddUser, [
      username,
      email,
      passwordHash,
    ]);
    conn.end();
    res.status(200).json({ success: true, token: token, id: newUser.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'database error',
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const queryFindUserByEmail = 'SELECT * FROM users WHERE email = ?;';
  try {
    const conn = await db.getConnection();
    const [users] = await conn.query(queryFindUserByEmail, [email]);
    conn.end();

    const user = users[0];

    //Check if email exists and pass is correct
    const isUserAndPassOk = !user
      ? false
      : await bcrypt.compare(password, user.password);

    //If FALSE
    if (!isUserAndPassOk) {
      return res
        .status(401)
        .json({ success: false, errorMessage: 'Invalid credentials' });
    }
    //If TRUE
    const infoForToken = {
      username: user.email,
      id: user.id,
    };
    const token = tokenUtils.generate(infoForToken);
    return res.status(200).json({
      success: true,
      token,
      username: user.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'database error',
    });
  }
};

module.exports = { signup, login };
