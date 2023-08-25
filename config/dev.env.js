var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  // 以下配置是开发临时用的配置 随时可能失效 请替换为自己的
  GITHUB_CLIENT_ID: '"845b8f75df48f2ee0563"',
  GITHUB_CLIENT_SECRET: '"80df676597abded1450926861965cc3f9bead6a0"',
  GITEE_CLIENT_ID: '"925ba7c78b85dec984f7877e4aca5cab10ae333c6d68e761bdb0b9dfb8f55672"',
  GITEE_CLIENT_SECRET: '"f05731066e42d307339dc8ebbb037a103881dafc7207a359a393b87749f1c562"',
  CLIENT_ID: '"thF3qCGLN39OtafjGnqHyj6n02WwE6xD"',
  // GITEA_CLIENT_ID: '"fe30f8f9-b1e8-4531-8f72-c1a5d3912805"',
  // GITEA_CLIENT_SECRET: '"lus7oMnb3H6M1hsChndphArE20Txr7erwJLf7SDBQWTw"',
  // GITEA_URL: '"https://gitea.test.com"',
  GITLAB_CLIENT_ID: '"074cd5103c62dea0f479dac861039656ac80935e304c8113a02cc64c629496ae"', 
  GITLAB_CLIENT_SECRET: '"6f406f24216b686d55d28313dec1913c2a8e599afdb08380d5e8ce838e16e41e"',
  GITLAB_URL: '"http://gitlab.qicoder.com"',
})