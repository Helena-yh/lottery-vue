const { resolve } = require('path');
const { createUploadClient } = require('./client');

const [,, ACCESS_KEY, SECRET_KEY, bucket, dirpath, dirKey] = process.argv;

const client = createUploadClient(ACCESS_KEY, SECRET_KEY, bucket);

(async () => {
  await client.uploadDir(dirKey, resolve(__dirname, '../..', dirpath));
})();
