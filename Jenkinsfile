@NonCPS
String getTag(boolean isEnterprise, String mode) {
  if (isEnterprise) {
    return mode == 'Development' ? 'enterprise-alpha' : 'enterprise'
  }
  return mode == 'Development' ? 'alpha' : 'latest'
}

@NonCPS
String getVersion(String originalVersion, boolean isEnterprise, String mode, String buildId) {
  if (mode == 'Development') {
    return isEnterprise ? "${originalVersion}-enterprise-alpha.${buildId}" : "${originalVersion}-alpha.${buildId}"
  }
  return isEnterprise ? "${originalVersion}-enterprise.${buildId}" : originalVersion
}

def isEnterprise
def mode
def buildId
def version
def tag

pipeline {
  agent { label 'master' }
  environment {
    // Npm 源仓库 Token
    NPM_REGISTRY_TOKEN = credentials('web-public-npm-token')
    // 七牛存储 AccessKey
    CDN_ACCESS_KEY = credentials('web-cdn-access-key')
    // 七牛存储 Secret
    CDN_SECRET_KEY = credentials('web-cdn-secret-key')
    // npm 源仓库地址
    NPM_REGISTRY_URL = 'registry.npmjs.org'
    // Web IMKit APIDOC 存储工程
    APIDOC_REGISTRY = 'git@gitlab2.rongcloud.net:documentation/apidoc-im-uikit-web.git'
  }
  parameters {
    // Git 分支选择
    gitParameter(
      branch: '',
      branchFilter: 'origin/(?!beem)(.*)',
      defaultValue: 'origin/develop',
      description: '<strong>选择 IMKit 仓库源码分支，注意：工程仓库重构前的分支无效</strong>',
      name: 'GIT_BRANCH',
      quickFilterEnabled: true,
      selectedValue: 'DEFAULT',
      sortMode: 'NONE',
      tagFilter: '*',
      type: 'PT_BRANCH',
      useRepository: 'git@gitlab2.rongcloud.net:websdk-team/packages/global-im-uikit.git',
    )
    // BUILD_ID
    string(
      name: 'BUILD_ID',
      defaultValue: '1',
      description: '<strong>构建私有云版本或测试版本时必填，用于追加版本号尾数，如：</strong><br><ul><li>`5.6.10-alpha.{BUILD_ID}`</li><li>`5.6.10-enterprise.{BUILD_ID}`</li><li>`5.6.10-enterprise-alpha.{BUILD_ID}`</li></ul>'
    )
    // 发布私有云选项，默认 false
    booleanParam(
      name: 'IS_ENTERPRISE',
      defaultValue: false,
      description: '<strong>勾选以构建私有云版本，私有云版本版本号序列默认追加 `-enterprise.{BUILD_ID}`</strong>'
    )
    // MODE
    choice(
      name: 'MODE',
      choices: 'Development\nProduction',
      description: '<strong>选择构建模式为 Development 或 Production。</strong><ul><li>Development - 保留代码 SourceMap，不会对代码进行混淆压缩，构建版本号会追加 `-alpha.{BUILD_ID}`</li><li>Production - 上线版本，压缩混淆；</li></ul>'
    )
    choice(
      name: 'TARGET',
      choices: 'SDK\nDEMO',
      description: '<strong>选择发布 SDK 或 Demo</strong>'
    )
    booleanParam(
      name: 'UPDATE_APIDODC_LATEST_LINK',
      defaultValue: false,
      description: '<strong>勾选以更新 APIDoc 线上 latest 版本指向，仅对构建公有云 SDK 线上版本时有效！请谨慎操作！</strong>'
    )
  }
  stages {
    stage('INIT') {
      steps {
        script {
          isEnterprise = params.IS_ENTERPRISE
          mode = params.MODE
          buildId = params.BUILD_ID
          tag = getTag(isEnterprise, mode)

          def pkg = readJSON file:'./package.json'
          version = getVersion(pkg.version, isEnterprise, mode, buildId)

          // 打印 node 版本信息
          sh 'node -v'

          // 依赖安装
          sh 'git clean -df'
          sh 'npm i --registry=https://registry.npmmirror.com'
        }
      }
    }
    stage('SDK') {
      when {
        expression {
          return params.TARGET == 'SDK'
        }
      }
      stages {
        stage('SDK:BUILD') {
          steps {
            // 编译 SDK
            sh "IS_ENTERPRISE=${isEnterprise} MODE=${mode} BUILD_ID=${buildId} npm run build"
            sh "ls release -l"

            // 备注构建记录信息
            buildDescription "Version: ${version}<br>UPDATE_APIDODC_LATEST_LINK: ${params.UPDATE_APIDODC_LATEST_LINK}"
          }
        }
        stage('SDK:PUB') {
          parallel {
            stage('PUB_NPM') {
              steps {
                script {
                  dir('release/npm') {
                    def registry = NPM_REGISTRY_URL
                    def token = NPM_REGISTRY_TOKEN

                    sh "echo \"registry=https://${registry}/\" > .npmrc"
                    sh "echo \"//${registry}/:_authToken=${token}\" >> .npmrc"
                    sh "cat .npmrc"

                    if (tag == 'latest') {
                      sh "npm publish --access=public"
                    } else {
                      sh "npm publish --access=public --tag=${tag}"
                    }

                    // 同步 cnpm
                    // sh "curl -X PUT 'https://npmmirror.com/sync/@ronggcloud/global-im-uikit?sync_upstream=true'"
                  }
                }
              }
            }
            stage('PUB_CDN') {
              when {
                expression {
                  // 仅生产模式需要上传 CDN 文件
                  return mode == 'Production'
                }
              }
              steps {
                script {
                  dir('release/cdn') {
                    def file = findFiles()[0]
                    def filename = file.name
                    def zipname = "${filename}.zip"

                    // 打包并归档
                    sh "zip -q $zipname $filename"
                    archiveArtifacts artifacts: "$zipname", fingerprint: true, onlyIfSuccessful: true, allowEmptyArchive: true

                    sh "ls -l"

                    // 上传 SDK js 文件至 cdn-ronghub-com bucket
                    sh "npm run upload:file ${CDN_ACCESS_KEY} ${CDN_SECRET_KEY} cdn-ronghub-com release/cdn/${filename} ${filename}"
                    // 上传 zip 文件至 rongcloud-sdk bucket（产品需求）
                    sh "npm run upload:file ${CDN_ACCESS_KEY} ${CDN_SECRET_KEY} rongcloud-sdk release/cdn/${zipname} ${zipname}"
                  }
                }
              }
            }
            stage('APIDOC') {
              when {
                expression {
                  // 仅生产模式、且非私有云版本时需要更新 APIDoc
                  return mode == 'Production' && !isEnterprise
                }
              }
              steps {
                script {
                  dir('release') {
                    // 打包归档
                    def zipname = "RCIMKit-APIDoc-v${version}-zh_CN.zip"
                    zip archive: true, dir: "apidoc", zipFile: "$zipname", overwrite: true

                    // clone 文档工程
                    // sh "git clone ${APIDOC_REGISTRY} doc-registry --no-tags -b develop"
                    sh "git --version && git clone ${APIDOC_REGISTRY} doc-registry -b develop"
 
                    // 拷贝文档至 apidoc-im-uikit-web
                    sh "mkdir -p doc-registry/v${version} && rm -rf doc-registry/v${version}/zh_CN && cp -rf apidoc doc-registry/v${version}/zh_CN"
                    sh "cp -rf ${zipname} doc-registry/${zipname}"

                    // 更新 latest 版本
                    if (params.UPDATE_APIDODC_LATEST_LINK) {
                      sh "mkdir -p doc-registry/latest && rm -rf doc-registry/latest/zh_CN && cp -rf apidoc doc-registry/latest/zh_CN"
                    }

                    // git 归档
                    sh "cd doc-registry && git add . && git commit -m \"docs: update v${version} by Jenkins.\" && git push"
                  }
                }
              }
            }
          }
        }
      }
    }
    stage('DEMO') {
      when {
        expression {
          return params.TARGET == 'DEMO'
        }
      }
      steps {
        script {
          // // 编译 demo
          sh "IS_ENTERPRISE=${isEnterprise} MODE=${mode} BUILD_ID=${buildId} npm run build:demo"

          // 上传至 webqa.rongcloud.net/static/jenkins/global-im-uikit-demo/${version}
          def remoteDir = "/data/webqa.rongcloud.net/static/jenkins/global-im-uikit-demo/${version}/"
          def branchDir = "/data/webqa.rongcloud.net/static/jenkins/global-im-uikit-demo/${params.GIT_BRANCH}/"

          sh "ssh -tt root@59.110.17.191 \"rm -rf ${remoteDir} ${branchDir} && mkdir -p ${remoteDir} ${branchDir}\""
          sh "scp -r $WORKSPACE/dist/* root@59.110.17.191:${remoteDir}"
          sh "ssh -tt root@59.110.17.191 \"cp -rf ${remoteDir}/* ${branchDir}\""

          // 备注构建记录信息
          def url = "https://webqa.rongcloud.net/static/jenkins/global-im-uikit-demo/${version}"
          def branchUrl = "https://webqa.rongcloud.net/static/jenkins/global-im-uikit-demo/${params.GIT_BRANCH}"
          buildDescription "部署地址：<br>${url}<br>${branchUrl}"
        }
      }
    }
  }
}