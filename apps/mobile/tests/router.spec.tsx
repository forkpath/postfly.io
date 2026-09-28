import { Link, useLocalSearchParams } from 'expo-router'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { Text } from 'react-native'

// Test-only routes are kept outside src/app and never enter the app bundle.
const Home = () => <Link href="/details?source=home">Open details</Link>
const Details = () => {
  const { source } = useLocalSearchParams<{ source: string }>()
  return <Text>Details from {source}</Text>
}

afterEach(() => jest.useRealTimers())

describe('Expo Router fixture', () => {
  it('navigates from an entry route and preserves URL parameters', async () => {
    await renderRouter({ index: Home, details: Details }, { initialUrl: '/' })
    await fireEvent.press(screen.getByText('Open details'))
    expect(await screen.findByText('Details from home')).toBeOnTheScreen()
  })

  it('opens a route directly from a deep link', async () => {
    await renderRouter({ index: Home, details: Details }, { initialUrl: '/details?source=link' })
    expect(await screen.findByText('Details from link')).toBeOnTheScreen()
  })
})
