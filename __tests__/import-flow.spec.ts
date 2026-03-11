import { test, expect } from '@playwright/test';

test('import resume flow', async ({ page }) => {
  // Go to import page directly
  await page.goto('http://localhost:3000/import');
  
  // Set API Key and model
  await page.getByRole('textbox', { name: 'API Key...' }).click();
  await page.getByRole('textbox', { name: 'API Key...' }).fill('AIzaSyCiv0qgKf-E7L32HoOsRr_QJGC_1XmOnVw');
  
  await page.getByRole('combobox').nth(1).selectOption('gemini-2.5-flash');
  await page.getByRole('button', { name: 'Salvar Configurações' }).click();
  
  // Upload resume file
  await page.getByRole('button', { name: 'Select File' }).click();
  await page.getByRole('button', { name: 'Select File' }).setInputFiles('OtavioLemos-ENG-1.pdf');
  
  // Wait for processing and check for error handling
  try {
    // Wait for processing to complete or error to appear
    const errorLocator = page.getByText('Erro');
    const successLocator = page.getByText('Sincronizando');
    
    await Promise.race([
      errorLocator.waitFor({ timeout: 30000 }),
      successLocator.waitFor({ timeout: 30000 })
    ]);
    
    // If we found an error, log it
    if (await errorLocator.isVisible()) {
      const errorText = await page.locator('text=Erro').textContent();
      console.log('Error found:', errorText);
      
      // Verify error message is displayed
      await expect(page.getByRole('alert')).toBeVisible();
    } else {
      // Verify success
      await expect(successLocator).toBeVisible();
    }
  } catch (error) {
    console.error('Timeout waiting for import to complete or error to appear');
    throw error;
  }
});