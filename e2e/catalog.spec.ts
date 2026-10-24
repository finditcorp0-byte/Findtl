import { test, expect } from '@playwright/test';

test.describe('Catálogo /objetos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/objetos');
    await page.waitForLoadState('networkidle');
  });

  test('should load catalog page successfully', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Objetos perdidos y encontrados');
    await expect(page.locator('input[placeholder*="Busca"]')).toBeVisible();
  });

  test('should filter by type (lost/found)', async ({ page }) => {
    // The filters are radio buttons with labels
    await page.click('label:has-text("Perdidos")');
    await expect(page.locator('input[name="tipo-reporte"][value="lost"]')).toBeChecked();
    
    await page.click('label:has-text("Encontrados")');
    await expect(page.locator('input[name="tipo-reporte"][value="found"]')).toBeChecked();
    
    await page.click('label:has-text("Todos")');
    await expect(page.locator('input[name="tipo-reporte"][value="todos"]')).toBeChecked();
  });

  test('should filter by category', async ({ page }) => {
    // Category select dropdown
    await page.selectOption('#categoria-objeto', 'electronicos');
    await expect(page.locator('#categoria-objeto')).toHaveValue('electronicos');
  });

  test('should filter by campus/zone', async ({ page }) => {
    // Zone/Campus select dropdown - using the correct ID from the UI
    await page.selectOption('#zona-objeto', 'Biblioteca central');
    await expect(page.locator('#zona-objeto')).toHaveValue('Biblioteca central');
  });

  test('should search by text query', async ({ page }) => {
    await page.fill('input[placeholder*="Busca"]', 'Sony');
    await page.click('button:has-text("Buscar")');
    
    await expect(page.locator('text=Sony')).toBeVisible({ timeout: 5000 });
  });

  test('should show object cards with correct info', async ({ page }) => {
    // Check that our seeded objects are displayed
    await expect(page.locator('text=Audífonos Sony WH-1000XM5')).toBeVisible();
    await expect(page.locator('text=Cargador MacBook Pro')).toBeVisible();
  });

  test('should navigate to object detail on click', async ({ page }) => {
    // Click on the first object card (Audífonos)
    await page.click('article:has-text("Audífonos Sony WH-1000XM5") >> a');
    
    // Should navigate to detail page with UUID in URL
    await expect(page).toHaveURL(/\/objetos\/e2e88888-8888-8888-8888-888888888888/);
    await expect(page.locator('h1')).toContainText('Audífonos Sony WH-1000XM5');
  });

  test('should show published badge on published objects', async ({ page }) => {
    await expect(page.locator('text=Publicado')).toBeVisible();
  });
});