const qiniu = require('qiniu');
const { existsSync, readdirSync, statSync } = require('fs');
const { resolve } = require('path');

/**
 * @param {String} msg
 */
const log = (msg) => console.log(`> ${msg}`);
/**
 * @param {String} msg
 */
const warn = (msg) => console.warn(`> [WARN] ${msg}`);
/**
 * @param {String} msg
 */
const error = (msg) => console.error(`> [ERROR] ${msg}`);

/**
 * 创建上传客户端实例
 * @param {String} accessKey
 * @param {String} secretKey
 * @param {String} bucket
 */
module.exports.createUploadClient = (accessKey, secretKey, bucket) => {
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: bucket,
    expires: 3600,
  });
  const token = putPolicy.uploadToken(mac);

  return {
    /**
     * 上传文件
     * @param {String} key - 资源访问目录，即 http 请求路径
     * @param {String} abspath - 本地绝地路径
     * @param {Boolean} ignoreCheck - 忽略文件检查
     */
    async upload(key, abspath, ignoreCheck = true) {
      if (!ignoreCheck) {
        if (!existsSync(abspath)) {
          error(`'${abspath}' is not existsed!`);
          return;
        }

        if (!statSync(abspath).isFile()) {
          error(`'${abspath}' is not a file!`);
          return;
        }
      }
      return new Promise((resolve) => {
        const formUploader = new qiniu.form_up.FormUploader(new qiniu.conf.Config());
        try {
          formUploader.putFile(token, key, abspath, null, (err, respBody, resp) => {
            if (err) {
              error(`upload '${abspath}' error: ${err.message}`);
              resolve();
              return;
            }

            const { statusCode: code } = resp;
            if (code !== 200) {
              warn(`upload '${abspath}' failed: ${code}`);
            } else {
              log(`upload '${abspath}' success`);
            }
            resolve();
          });
        } catch (err) {
          error(`upload '${abspath}' error: ${err.message}`);
          resolve();
        }
      });
    },

    /**
     * 遍历文件夹，将其中文件一一对应上传
     * @param {String} dirKey - 资源访问目录，即 http 请求路径
     * @param {String} abspath - 需要上传的本地文件夹绝对路径
     */
    async uploadDir(dirKey, abspath) {
      if (!existsSync(abspath)) {
        error(`'${abspath}' is not existsed!`);
        return;
      }

      if (!statSync(abspath).isDirectory()) {
        error(`'${abspath}' is not a directory!`);
        return;
      }

      for (let item of files) {
        const filepath = resolve(abspath, item);

        if (statSync(filepath).isFile()) {
          await this.upload(`${dirKey}/${item}`, filepath);
        } else {
          await this.uploadDir(`${dirKey}/${item}`, filepath);
        }
      }
    },
  };
};
