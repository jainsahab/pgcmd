#!/usr/bin/env node

const { Client } = require('pg');
const readline = require('readline');
const GREEN = "\x1b[32m%s\x1b[0m";

const argv = require('yargs')
  .option('host',     { type: 'string', alias: 'h', default: process.env.PGHOST || 'localhost' })
  .option('port',     { type: 'number', alias: 'o', default: process.env.PGPORT || 5432 })
  .option('user',     { type: 'string', alias: 'u', default: process.env.PGUSER || process.env.USER })
  .option('password', { type: 'string', alias: 'p', default: process.env.PGPASSWORD || ' ' })
  .option('database', { type: 'string', alias: 'd', default: process.env.PGDATABASE })
  .option('timeout',  { type: 'number', alias: 't', default: 60 })
  .option('param',    { type: 'array',  alias: 'm', default: [] })
  .option('session',  {type: 'boolean', alias: 's', default: false})
  .strict(true)
  .argv;

function readInput() {
  return new Promise(resolve => {
    let data = Buffer.alloc(0);

    process.stdin.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
    });

    process.stdin.on('end', () => {
      resolve(data.toString());
    });
  });
}

async function getQuery() {
  if (argv._.length !== 0 && argv._[0] !== '-')
    return argv._[0];

  return await readInput();
}

function getClient() {
  return new Client({
    host: argv.host,
    port: argv.port,
    user: argv.user,
    password: argv.password,
    database: argv.database,
    statement_timeout: argv.timeout * 1000,
  });
}

async function main() {
  const client = getClient();

  try {
    await client.connect();

    const query = await getQuery();
    const params = argv.param;

    const { rows } = await client.query(query, params);

    console.log(JSON.stringify(rows, null, 2));
  }
  catch (error) {
    console.error(error);
  }
  finally {
    await client.end();
  }
}

async function session() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const client = getClient();

  try {
    await client.connect();
    console.log(GREEN, "Connection successful");
    const params = argv.param;

    rl.on('line', async (input) => {
      if(input.length){
        const {rows} = await client.query(input, params);
        console.log(JSON.stringify(rows, null, 2));
      }
    });
    rl.on('SIGINT', async () => {
      await client.end();
      console.log(GREEN, "bye bye");
      process.exit();
    });
  } catch (error) {
    console.error(error);
    process.exit();
  }
}

if (!argv.session) {
  main();
} else  {
  session();
}
