import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'e2e.admin@utb.edu.co',
  password: 'TestPass123!',
};

test.describe('Panel Admin /admin', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', TEST_ADMIN.email);
    await page.fill('input[id="password"][type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should access admin panel', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administración');
  });

  test('should show pending reviews section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#pendientes-titulo')).toBeVisible();
    await expect(page.locator('text=Reclamaciones pendientes de revisión')).toBeVisible();
  });

  test('should show needs more info section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#necesitan-titulo')).toBeVisible();
  });

  test('should show pending deliveries section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#entregas-titulo')).toBeVisible();
  });

  test('should have quick actions in sidebar', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Acciones rápidas')).toBeVisible();
    await expect(page.locator('a:has-text("Publicar objeto")')).toBeVisible();
    await expect(page.locator('a:has-text("Ver catálogo")')).toBeVisible();
    await expect(page.locator('a:has-text("Mi perfil")')).toBeVisible();
  });

  test('should navigate to publicar from quick actions', async ({ page }) => {
    await page.goto('/admin');
    await page.click('a:has-text("Publicar objeto")');
    await expect(page).toHaveURL('/publicar');
    await expect(page.locator('h1')).toContainText('Publica un objeto');
  });

  test('should navigate to catalog from quick actions', async ({ page }) => {
    await page.goto('/admin');
    await page.click('a:has-text("Ver catálogo")');
    await expect(page).toHaveURL('/objetos');
  });

  test('should navigate to profile from quick actions', async ({ page }) => {
    await page.goto('/admin');
    await page.click('a:has-text("Mi perfil")');
    await expect(page).toHaveURL('/perfil');
  });
});

test.describe('Admin access control', () => {
  test('should deny access to non-admin users', async ({ page }) => {
    // Login as student (non-admin)
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', 'e2e.student@utb.edu.co');
    await page.fill('input[id="password"][type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Try to access admin panel
    await page.goto('/admin');
    
    // Should get 404 (notFound) or redirect
    await expect(page.locator('h1')).toContainText('404');
  });
});