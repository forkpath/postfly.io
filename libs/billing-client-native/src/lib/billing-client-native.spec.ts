import { billingClientNative } from './billing-client-native'

describe('billingClientNative', () => {
  it('should work', () => {
    expect(billingClientNative()).toEqual('billing-client-native')
  })
})
