const { resolve } = require('path');
const { createUploadClient } = require('./client');

const [,, ACCESS_KEY, SECRET_KEY, bucket, filepath, key] = process.argv;

const client = createUploadClient(ACCESS_KEY, SECRET_KEY, bucket);

(async () => {
  await client.upload(key, resolve(__dirname, '../..', filepath), false);
})();
