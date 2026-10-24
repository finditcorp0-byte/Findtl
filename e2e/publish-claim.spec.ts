import { test, expect } from '@playwright/test';

const TEST_STUDENT = {
  email: 'e2e.student@utb.edu.co',
  password: 'TestPass123!',
};

const TEST_ADMIN = {
  email: 'e2e.admin@utb.edu.co',
  password: 'TestPass123!',
};

test.describe('Publicar objeto', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', TEST_STUDENT.email);
    await page.fill('input[id="password"][type="password"]', TEST_STUDENT.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should navigate to publicar page', async ({ page }) => {
    await page.goto('/publicar');
    await expect(page.locator('h1')).toContainText('Publica un objeto perdido o encontrado');
  });

  test('should fill and submit publish form', async ({ page }) => {
    await page.goto('/publicar');
    
    // Select type "Lo perdí" (lost)
    await page.click('label:has-text("Lo perdí")');
    await expect(page.locator('input[name="tipo-reporte"][value="lost"]')).toBeChecked();
    
    // Fill form
    await page.fill('#titulo-objeto', 'Test Object E2E - Laptop');
    await page.fill('#descripcion-objeto', 'Laptop Dell XPS 13 color plata, etiqueta universitaria en la parte inferior.');
    
    // Select category
    await page.selectOption('#categoria-objeto', 'electronicos');
    await expect(page.locator('#categoria-objeto')).toHaveValue('electronicos');
    
    // Select zone
    await page.selectOption('#zona-objeto', 'Biblioteca central');
    await expect(page.locator('#zona-objeto')).toHaveValue('Biblioteca central');
    
    // Set date (today)
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#fecha-objeto', today);
    
    // Submit
    await page.click('button:has-text("Enviar reporte")');
    
    // Should show success
    await expect(page.locator('text=Reporte registrado')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Reclamación de objeto', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', TEST_STUDENT.email);
    await page.fill('input[id="password"][type="password"]', TEST_STUDENT.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should claim a published object', async ({ page }) => {
    // Navigate to the published object
    await page.goto('/objetos/e2e88888-8888-8888-8888-888888888888');
    await page.waitForLoadState('networkidle');
    
    // Check we're on detail page
    await expect(page).toHaveURL(/\/objetos\/e2e88888-8888-8888-8888-888888888888/);
    await expect(page.locator('h1')).toContainText('Audífonos Sony WH-1000XM5');
    
    // Click claim button - for "lost" objects it shows "Iniciar recuperación"
    await page.click('button:has-text("Iniciar recuperación")');
    
    // Should open modal
    await expect(page.locator('dialog[aria-labelledby="claim-titulo"]')).toBeVisible();
    
    // Fill description
    await page.fill('textarea[id="descripcion-reclamo"]', 'Son mis audífonos, los perdí ayer en la biblioteca. Tienen una etiqueta azul en el estuche.');
    
    // Submit
    await page.click('button:has-text("Enviar solicitud")');
    
    // Should show success
    await expect(page.locator('text=Reclamación registrada')).toBeVisible({ timeout: 10000 });
  });

  test('should show claim in profile', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page.locator('h2:has-text("Mis reclamaciones"), h2:has-text("En curso")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Publicar como admin', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', TEST_ADMIN.email);
    await page.fill('input[id="password"][type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should access publicar page as admin', async ({ page }) => {
    await page.goto('/publicar');
    await expect(page.locator('h1')).toContainText('Publica un objeto perdido o encontrado');
  });
});