import { render } from '@testing-library/react'

import Studio from './studio'

describe('Studio', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Studio />)
    expect(baseElement).toBeTruthy()
  })
})
