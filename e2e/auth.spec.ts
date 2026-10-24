import { test, expect } from '@playwright/test';

const TEST_STUDENT = {
  email: 'e2e.student@utb.edu.co',
  password: 'TestPass123!',
};

const TEST_ADMIN = {
  email: 'e2e.admin@utb.edu.co',
  password: 'TestPass123!',
};

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('should show login page with email/password form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
    await expect(page.locator('input[id="email"][type="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"][type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    // Check for HTML5 validation or error message
    await expect(page.locator('input[id="email"]:invalid, input[id="password"]:invalid')).toHaveCount(2);
  });

  test('should navigate to registro page', async ({ page }) => {
    await page.click('a:has-text("Regístrate")');
    await expect(page).toHaveURL(/\/registro/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[id="email"][type="email"]', TEST_STUDENT.email);
    await page.fill('input[id="password"][type="password"]', TEST_STUDENT.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to home after login
    await expect(page).toHaveURL('/');
    // Check that user is logged in (navbar shows user menu or similar)
    await expect(page.locator('text=Mi perfil')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[id="email"][type="email"]', 'invalid@test.com');
    await page.fill('input[id="password"][type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message - Supabase returns error on the page
    await expect(page.locator('text=/error|incorrect|invalid|credenciales/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registro');
    await page.waitForLoadState('networkidle');
  });

  test('should show registration form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Crear cuenta');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('should validate password match', async ({ page }) => {
    await page.fill('input[name="email"]', 'newuser@utb.edu.co');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'different');
    await page.click('button[type="submit"]');
    
    // Check for validation error (HTML5 or custom)
    await expect(page.locator('text=/coinciden|match|igual/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate password length', async ({ page }) => {
    await page.fill('input[name="email"]', 'newuser2@utb.edu.co');
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="confirmPassword"]', '123');
    await page.click('button[type="submit"]');
    
    // Check for minlength validation
    await expect(page.locator('input[name="password"]:invalid')).toBeVisible();
  });
});

test.describe('Logout', () => {
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[id="email"][type="email"]', TEST_STUDENT.email);
    await page.fill('input[id="password"][type="password"]', TEST_STUDENT.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Find and click logout button (in navbar user menu)
    await page.click('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")');
    
    // Should redirect to login or home
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
  });
});