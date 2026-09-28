import { expect, test } from './fixtures'

for (const name of ['popup', 'options', 'sidepanel', 'newtab', 'tabs']) {
  test(`${name} starts, talks to its background worker and survives reload`, async ({
    page,
    extensionId
  }, testInfo) => {
    await page.goto(`chrome-extension://${extensionId}/${name}.html`)
    await expect(page.locator('main code')).toHaveText(`app/${name}`)
    await page.reload()
    await expect(page.locator('main code')).toHaveText(`app/${name}`)
    await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
  })
}

test('content script injects interactive UI into the host page', async ({ context, page, extensionId }) => {
  expect(extensionId).toBeTruthy()
  const url = 'http://127.0.0.1:4178/extension-smoke'
  await context.route(url, route =>
    route.fulfill({ contentType: 'text/html', body: '<html><body><h1>Content host</h1></body></html>' })
  )
  await page.goto(url)
  const button = page.getByRole('button', { name: 'Content script UI' })
  await expect(button).toBeVisible()
  const dialog = page.waitForEvent('dialog').then(async alert => {
    const message = alert.message()
    await alert.accept()
    return message
  })
  await button.click()
  expect(await dialog).toBe('This is injected UI!')
})

test('storage persists across extension page reloads', async ({ context, page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await context.serviceWorkers()[0].evaluate(async () => {
    await chrome.storage.local.set({ frameworkMarker: 'isolated-profile' })
  })
  await page.reload()
  expect(await page.evaluate(async () => (await chrome.storage.local.get('frameworkMarker')).frameworkMarker)).toBe(
    'isolated-profile'
  )
})
