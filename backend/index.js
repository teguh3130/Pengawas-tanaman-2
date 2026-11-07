'use strict';

require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n Pengawas Tanaman Backend`);
  console.log(`   Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   Started : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);
});

