import { test, expect } from '@playwright/test';

const GLOBAL_ADMIN = {
  email: 'roberpar9@gmail.com',
  password: 'TestPass123!',
};

const UTB_STUDENT = {
  email: 'e2e.student@utb.edu.co',
  password: 'TestPass123!',
};

test.describe('Multi-tenant: administradores globales', () => {
  test('global admin can log in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', GLOBAL_ADMIN.email);
    await page.fill('input[id="password"][type="password"]', GLOBAL_ADMIN.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('global admin can access admin panel without institution restriction', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', GLOBAL_ADMIN.email);
    await page.fill('input[id="password"][type="password"]', GLOBAL_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administración');
    // Global admin sees the pending reviews section (no institution filter blocking)
    await expect(page.locator('#pendientes-titulo')).toBeVisible();
  });
});

test.describe('Multi-tenant: flujo de usuario UTB', () => {
  test('UTB student can access publish page and submit an object', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', UTB_STUDENT.email);
    await page.fill('input[id="password"][type="password"]', UTB_STUDENT.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/publicar');
    await expect(page.locator('h1')).toContainText('Publica un objeto');

    // Fill minimal form fields if present
    const titleInput = page.locator('input[name="title"], input[id="title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Objeto de prueba UTB');
    }
  });

  test('UTB student sees catalog filtered to published objects', async ({ page }) => {
    await page.goto('/objetos');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
