import { join } from 'path';
import { execSync } from 'child_process';
import { version as v, dependencies } from '../package.json';

/**
 * Git 仓库当前 CommitId
 */
export const commitId = execSync('git rev-parse HEAD').toString().replace(/\s/g, '');

/**
 * 是否构建私有云版本。构建私有云版本通过 `IS_ENTERPRISE=true BUILD_ID=1 npm run release` 进行指定
 */
export const isEnterprise = process.env.IS_ENTERPRISE === 'true';

/**
 * 构建模式：production | development
 */
export const mode = process.env.MODE?.toLowerCase() === 'production' ? 'production' : 'development';

/**
 * 是否为开发模式
 */
export const isDev = mode === 'development';

/**
 * 构建 ID，当构建模式为 `development` 或私有云构建时，必须指定 BUILD_ID
 */
export const buildId = process.env.BUILD_ID || '1';

if (!/^\d+$/.test(buildId)) {
  if (isEnterprise) {
    throw new Error('Build enterprise version failed, `BUILD_ID` should be a number!');
  }
  if (isDev) {
    throw new Error('Build alpha version failed, `BUILD_ID` should be a number!');
  }
}

/**
 * 构建版本号，根据 `process.env.IS_ENTERPRISE` 及 `process.env.BUILD_ID` 确定
 */
export const version = [
  v,
  isEnterprise ? '-enterprise' : '',
  isDev ? '-alpha' : '',
  (isEnterprise || isDev) && buildId ? `.${buildId}` : '',
].join('');

/**
 * rollup 编译时需要替换的常量定义
 */
export const compileDefinedValues = {
  __COMMIT_ID__: JSON.stringify(commitId),
  __VERSION__: JSON.stringify(version),
  __IS_ENTERPRISE__: isEnterprise,
  __DEV__: isDev,
  __REQUIRED_ENGINE_VERSION__: JSON.stringify(dependencies['@rongcloud/engine'].match(/(\d+\.){2}\d+/)[0]),
  'process.env.NODE_ENV':'"production"', // 将打入 kit 中的 vue 改为生产环境
};
/**
 * 工程根目录
 */
export const root = join(__dirname, '..');
/**
 * SDK 源码目录
 */
export const libRoot = join(root, 'src');
