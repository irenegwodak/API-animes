//IMPORT NPM REQUIRED
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

//CREATE & CONFIG SERVER
const server = express();
server.use(cors());
server.use(express.json());

// SERVER PORT
const serverPort = 3113;
server.listen(serverPort, () =>
  console.log(`Server listening at http://localhost:${serverPort}`)
);

async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.HOST,
    user: process.env.DBUSER,
    password: process.env.PASS,
    database: process.env.DATABASE,
  });
  await connection.connect();

  console.log(
    `Conexión establecida con la base de datos (identificador=${connection.threadId})`
  );
  return connection;
}

//Endpoint to insert data in animes table
/* Example
  ​http://localhost:3113/animes/
  {
  "title": "Naruto",
  "year": "2010",
  "chapters": "300"
} */
server.post('/animes', async (req, res) => {
  const { title, year, chapters } = req.body;

  const insertAnime =
    'INSERT INTO animes (title, year, chapters) VALUES (?, ?, ?);';

  console.log('Sending data to database');
  try {
    const conn = await getConnection();
    const [resultAnime] = await conn.query(insertAnime, [
      title,
      year,
      chapters,
    ]);
    conn.end();
    res.status(200).json({
      success: true,
      idNewAnime: resultAnime.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'database error',
    });
  }
});

//Endpoint to list all animes
/* Example
​http://localhost:3113/animes */
server.get('/animes', async (req, res) => {
  const queryAllAnimes = 'SELECT * FROM animes';
  console.log('Querying database');
  try {
    const conn = await getConnection();
    const [results] = await conn.query(queryAllAnimes);

    const numOfElements = results.length;

    res.json({
      success: true,
      info: { count: numOfElements },
      results: results,
    });
    conn.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'database error',
    });
  }
});

//Endpoint to update an anime
/* Example
  ​http://localhost:3113/animes/14
  {
  "title": "Kaze no Stigma",
  "year": "2023",
  "chapters": "10"
} */
server.put('/animes/:animeId', async (req, res) => {
  const paramsId = req.params.animeId;
  const { title, year, chapters } = req.body;

  //Check if anime exists in db by id
  console.log('Checking if anime existes');

  const queryIfAnimeExists = `SELECT * FROM animes WHERE idAnime = ${paramsId};`;
  const queryToModifyAnime =
    'UPDATE animes SET title = ?, year = ?, chapters = ? WHERE idAnime = ?;';
  try {
    const conn = await getConnection();
    // Get data to check if exists and to send in response
    const [animesSearch] = await conn.query(queryIfAnimeExists);
    //doesnt exist:
    if (animesSearch.length === 0) {
      conn.end();
      return res.status(404).json({
        success: false,
        error: 'anime not found',
      });
    }
    //Exists: send data to modify in db
    console.log('Sending data to database');
    const [modifyAnime] = await conn.query(queryToModifyAnime, [
      title,
      year,
      chapters,
      paramsId,
    ]);
    //Get new data to send in response
    const [animesModified] = await conn.query(queryIfAnimeExists);
    conn.end();

    res.status(200).json({
      success: true,
      msg: 'data modified successfully',
      'previous data': animesSearch[0],
      'new data': animesModified[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'database error',
    });
  }
});

//Endpoint to delete anime
/* Example 
  ​http://localhost:3113/animes/14
*/
server.delete('/animes/:animeId', async (req, res) => {
  console.log('Querying database');
  const paramsId = req.params.animeId;

  const queryIfAnimeExists = `SELECT * FROM animes WHERE idAnime = ?;`;
  const conn = await getConnection();
  const [animes] = await conn.query(queryIfAnimeExists, [paramsId]);
  if (animes.length === 0) {
    conn.end();
    return res.status(404).json({
      success: false,
      error: 'anime not found',
    });
  }
  const queryDeleteAnime = 'DELETE FROM animes WHERE idAnime = ?;';
  const [animeDeleted] = await conn.query(queryDeleteAnime, [paramsId]);
  conn.end();

  res.status(200).json({
    success: true,
    msg: `Anime "${animes[0].title}" deleted successfully`,
  });
});