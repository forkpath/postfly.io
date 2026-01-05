export interface RabbitmqConfig {
  uri: string
  exchangeName: string
  exchangeType: 'direct' | 'topic' | 'fanout'
}
