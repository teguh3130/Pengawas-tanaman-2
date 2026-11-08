'use strict';

require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n Pengawas Tanaman Backend`);
  console.log(`   Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Host    : ${HOST}`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   Started : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);
});

