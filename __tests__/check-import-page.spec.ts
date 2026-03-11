import { test, expect } from '@playwright/test';

test('screenshot import page', async ({ page }) => {
  await page.goto('http://localhost:3000/import');
  
  // Check page title
  await expect(page).toHaveTitle(/Import/);
  
  // Check if file upload button exists
  const uploadButton = page.getByRole('button', { name: /Select File|Selecionar Arquivo/ });
  await expect(uploadButton).toBeVisible();
  
  // Take screenshot of the page
  await page.screenshot({ path: 'import-page.png', fullPage: true });
  
  // Log the page content
  console.log('Page content:');
  console.log('-------------------');
  console.log(await page.textContent('body'));
  console.log('-------------------');
  
  console.log('Import page structure check completed successfully!');
  console.log('Screenshot saved as import-page.png');
});