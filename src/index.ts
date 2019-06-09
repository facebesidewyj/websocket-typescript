import EventEmitter from 'wolfy87-eventemitter'
import config from './config/config'
import { SocketParams } from './interface/socket-params'
const event = new EventEmitter()
/**
 * websocket封装
 * dev: facebesidewyj
 * @class
 */
export default class Socket {
  // 服务地址
  private url: string
  // websocket实例
  private webSocket: any
  // 心跳定时器
  private heartBeatTimer: any
  // socket连接成功的回调函数
  private openCallback: Function
  // socket接收消息的回调函数
  private messageCallback: Function
  // socket关闭的回调函数
  private closeCallback: Function
  // socket异常的回调函数
  private errorCallback: Function
  // 最大重连次数
  private reconnectLimit: number
  // 标识是否正在重连
  private isInReconnect: boolean = false
  // 重连次数
  private reconnectCount: number = 0

  constructor({
    url,
    reconnectLimit,
    openCallback,
    messageCallback,
    closeCallback,
    errorCallback
  }: SocketParams) {
    this.url = url || config.DEFAULT_URL
    this.reconnectLimit = reconnectLimit || config.RECONNECT_LIMIT
    this.openCallback = openCallback
    this.messageCallback = messageCallback
    this.closeCallback = closeCallback
    this.errorCallback = errorCallback
    this.createSocket()
  }
  /**
   * 初始化websocket
   */
  private createSocket(): void {
    try {
      this.webSocket = new WebSocket(this.url)
      this.initEventMonitor()
    } catch (e) {
      console.error('WebSocket创建连接失败')
    }
  }
  /**
   * 初始化ws事件监听
   */
  private initEventMonitor(): void {
    this.onOpen()
    this.onMessage()
    this.onClose()
    this.onError()
  }
  /**
   * 建立连接函数
   */
  private onOpen(): void {
    this.webSocket.addEventListener('open', (res: any) => {
      // 一旦建立成功，重置重连次数
      this.resetReconnectCount()
      // 暂停心跳
      this.stopHeartBeat()
      event.trigger('socketReady', [])
      if (this.openCallback) {
        this.openCallback(res)
      }
    })
  }
  /**
   * 接收数据函数
   */
  private onMessage(): void {
    this.webSocket.addEventListener('message', (res: any) => {
      if (this.messageCallback && res.data) {
        this.messageCallback(res.data)
      }
    })
  }
  /**
   * 关闭处理函数
   */
  private onClose(): void {
    this.webSocket.addEventListener('close', (res: any) => {
      console.error('WebSocket连接关闭，状态码：' + res.code)
      if (this.closeCallback) {
        this.closeCallback(res)
      }
      this.stopHeartBeat()

      // 非正常断开并且重连次数小于等于重连上限
      if (res.code !== config.ERROR_CODE.normal && this.reconnectCount <= this.reconnectLimit) {
        this.reconnect()
      }
    })
  }
  /**
   * 错误处理函数
   */
  private onError(): void {
    this.webSocket.addEventListener('error', (res: any) => {
      console.error('WebSocket in error')
      if (this.errorCallback) {
        this.errorCallback(res)
      }
      this.stopHeartBeat()
    })
  }
  /**
   * 手动关闭socket
   */
  public close(): void {
    this.webSocket.close()
  }
  /**
   * 发送业务数据
   * @param {Object} msg 业务数据json对象
   */
  public sendMsg(msg: any): void {
    this.readyToSendMessage(() => {
      try {
        let json = JSON.stringify(msg)
        this.webSocket.send(json)
      } catch (error) {
        console.error(error)
      }
    })
  }
  /**
   * 重连机制
   */
  private reconnect(): void {
    if (this.isInReconnect) {
      return
    }
    this.isInReconnect = true
    // 递增重试建立连接
    setTimeout(() => {
      this.createSocket()
      // 重连次数加1
      this.reconnectCount++
      this.isInReconnect = false
    }, config.RECONNECT_INTERVAL * this.reconnectCount)
  }
  /**
   * 保证发送状态就绪
   * @param {Function} success 成功回调
   */
  private readyToSendMessage(success: Function): void {
    // 发送时先判断连接是否关闭，如果已经关闭并且连接次数已经超过了上限（之前就触发过自动重连，并且在上限之内没有连接上）
    if (
      this.isSocketClosing() ||
      (this.isSocketClose() && this.reconnectCount > this.reconnectLimit)
    ) {
      // 重置连接次数
      this.resetReconnectCount()
      this.reconnect()
    }

    // 如果已经成功的建立了链接，则直接发送，否则监听websocketReady成功再发送
    if (this.isSocketOpen()) {
      if (success) {
        success()
      }
    } else {
      event.on('socketReady', () => {
        if (success) {
          success()
        }
      })
    }
  }
  /**
   * 开始心跳机制(5秒发送一次❤)
   */
  private startHeartBeat(): void {
    this.heartBeatTimer = setInterval(() => {
      this.webSocket.send('ping')
    }, config.HEART_INTERVAL)
  }
  /**
   * 停止心跳机制
   */
  private stopHeartBeat(): void {
    clearInterval(this.heartBeatTimer)
    this.heartBeatTimer = null
  }
  /**
   * 重置重连次数
   */
  private resetReconnectCount(): void {
    this.reconnectCount = 0
  }
  /**
   * 检查socket是否正在连接
   * @return {Boolean} 是否正在连接
   */
  private isSocketConnecting(): boolean {
    return this.webSocket && this.webSocket.readyState === WebSocket.CONNECTING
  }
  /**
   * 检查socket是否连接成功
   * @return {Boolean} 是否建立连接成功
   */
  private isSocketOpen(): boolean {
    return this.webSocket && this.webSocket.readyState === WebSocket.OPEN
  }
  /**
   * 检查socket是否正在关闭
   * @return {Boolean} 是否正在关闭
   */
  private isSocketClosing(): boolean {
    return this.webSocket && this.webSocket.readyState === WebSocket.CLOSING
  }
  /**
   * 检查socket是否已经关闭
   * @return {Boolean} 是否已经关闭
   */
  private isSocketClose(): boolean {
    return this.webSocket && this.webSocket.readyState === WebSocket.CLOSED
  }
}
