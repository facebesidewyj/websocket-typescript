/**
 * 协议配置文件
 * @type {Object}
 */
export default {
  // 默认服务地址
  DEFAULT_URL: '',
  // 重连上限默认值
  RECONNECT_LIMIT: 7,
  // 重连间隔基值（2秒）
  RECONNECT_INTERVAL: 2000,
  // 心跳间隔
  HEART_INTERVAL: 5000,
  // socket异常码
  ERROR_CODE: {
    normal: 1000
  }
}
