const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  // ssl:{ rejectUnauthorized: false }
});

console.log("Some info............", keys, pgClient)

pgClient.on('error', (err) => {
    console.error('PostgreSQL connection error:', err);
    // reject(err); // Reject the promise if there's an error
});

pgClient.on('connect', (client) => {
    console.log('Connected to PostgreSQL database');
    
    client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
    // resolve(pgClient); // Resolve the promise once connected
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
 try {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
 } catch (error) {
  console.log("error", error)
 }
  
});

app.get('/values/current', async (req, res) => {
  try {
    redisClient.hgetall('values', (err, values) => {
      res.send(values);
    });
  } catch (error) {
    console.log("Redis client error", error)
  }
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  try {
    // Begin PostgreSQL transaction
    await pgClient.query('BEGIN');

    // Insert into PostgreSQL
    await pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    // Insert into Redis
    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);

    // Commit PostgreSQL transaction
    await pgClient.query('COMMIT');

    res.send({ working: true });
  } catch (err) {
    
    // Rollback PostgreSQL transaction on error
    await pgClient.query('ROLLBACK');
    console.error('Transaction error: ', err);
    
    res.status(500).send('Internal Server Error');
  }
});

app.listen(5000, (err) => {
  console.log('Listening');
});
