export interface SocketParams {
  url: string
  reconnectLimit: number
  openCallback: Function
  messageCallback: Function
  closeCallback: Function
  errorCallback: Function
}
