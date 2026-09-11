import { billingServer } from './billing-server'

describe('billingServer', () => {
  it('should work', () => {
    expect(billingServer()).toEqual('billing-server')
  })
})
