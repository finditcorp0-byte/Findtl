# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Registro >> should validate password match
- Location: e2e\auth.spec.ts:71:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/coinciden|match|igual/i')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=/coinciden|match|igual/i') with timeout 5000ms
  - waiting for locator('text=/coinciden|match|igual/i')

```

```yaml
- link:
  - /url: /
  - img
- heading "Crear cuenta" [level=1]
- paragraph: Regístrate con tu correo institucional para acceder a FindIt Campus.
- text: Correo institucional
- textbox "Correo institucional":
  - /placeholder: tu@universidad.edu
- text: Contraseña
- textbox "Contraseña":
  - /placeholder: Mínimo 8 caracteres
- text: Confirmar contraseña
- textbox "Confirmar contraseña":
  - /placeholder: Repite la contraseña
- button "Crear cuenta"
- paragraph:
  - text: Al registrarte, aceptas nuestros
  - link "Términos de servicio":
    - /url: /terminos
  - text: "y"
  - link "Política de privacidad":
    - /url: /privacidad
- paragraph:
  - text: ¿Ya tienes cuenta?
  - link "Inicia sesión":
    - /url: /login
- alert
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const TEST_STUDENT = {
  4   |   email: 'e2e.student@utb.edu.co',
  5   |   password: 'TestPass123!',
  6   | };
  7   | 
  8   | const TEST_ADMIN = {
  9   |   email: 'e2e.admin@utb.edu.co',
  10  |   password: 'TestPass123!',
  11  | };
  12  | 
  13  | test.describe('Autenticación', () => {
  14  |   test.beforeEach(async ({ page }) => {
  15  |     await page.goto('/login');
  16  |     await page.waitForLoadState('networkidle');
  17  |   });
  18  | 
  19  |   test('should show login page with email/password form', async ({ page }) => {
  20  |     await expect(page.locator('h1')).toContainText('Iniciar sesión');
  21  |     await expect(page.locator('input[id="email"][type="email"]')).toBeVisible();
  22  |     await expect(page.locator('input[id="password"][type="password"]')).toBeVisible();
  23  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  24  |   });
  25  | 
  26  |   test('should show validation errors for empty fields', async ({ page }) => {
  27  |     await page.click('button[type="submit"]');
  28  |     // Check for HTML5 validation or error message
  29  |     await expect(page.locator('input[id="email"]:invalid, input[id="password"]:invalid')).toHaveCount(2);
  30  |   });
  31  | 
  32  |   test('should navigate to registro page', async ({ page }) => {
  33  |     await page.click('a:has-text("Regístrate")');
  34  |     await expect(page).toHaveURL(/\/registro/);
  35  |   });
  36  | 
  37  |   test('should login successfully with valid credentials', async ({ page }) => {
  38  |     await page.fill('input[id="email"][type="email"]', TEST_STUDENT.email);
  39  |     await page.fill('input[id="password"][type="password"]', TEST_STUDENT.password);
  40  |     await page.click('button[type="submit"]');
  41  |     
  42  |     // Should redirect to home after login
  43  |     await expect(page).toHaveURL('/');
  44  |     // Check that user is logged in (navbar shows user menu or similar)
  45  |     await expect(page.locator('text=Mi perfil')).toBeVisible({ timeout: 5000 });
  46  |   });
  47  | 
  48  |   test('should show error for invalid credentials', async ({ page }) => {
  49  |     await page.fill('input[id="email"][type="email"]', 'invalid@test.com');
  50  |     await page.fill('input[id="password"][type="password"]', 'wrongpassword');
  51  |     await page.click('button[type="submit"]');
  52  |     
  53  |     // Wait for error message - Supabase returns error on the page
  54  |     await expect(page.locator('text=/error|incorrect|invalid|credenciales/i')).toBeVisible({ timeout: 5000 });
  55  |   });
  56  | });
  57  | 
  58  | test.describe('Registro', () => {
  59  |   test.beforeEach(async ({ page }) => {
  60  |     await page.goto('/registro');
  61  |     await page.waitForLoadState('networkidle');
  62  |   });
  63  | 
  64  |   test('should show registration form', async ({ page }) => {
  65  |     await expect(page.locator('h1')).toContainText('Crear cuenta');
  66  |     await expect(page.locator('input[name="email"]')).toBeVisible();
  67  |     await expect(page.locator('input[name="password"]')).toBeVisible();
  68  |     await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  69  |   });
  70  | 
  71  |   test('should validate password match', async ({ page }) => {
  72  |     await page.fill('input[name="email"]', 'newuser@utb.edu.co');
  73  |     await page.fill('input[name="password"]', 'password123');
  74  |     await page.fill('input[name="confirmPassword"]', 'different');
  75  |     await page.click('button[type="submit"]');
  76  |     
  77  |     // Check for validation error (HTML5 or custom)
> 78  |     await expect(page.locator('text=/coinciden|match|igual/i')).toBeVisible({ timeout: 5000 });
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  79  |   });
  80  | 
  81  |   test('should validate password length', async ({ page }) => {
  82  |     await page.fill('input[name="email"]', 'newuser2@utb.edu.co');
  83  |     await page.fill('input[name="password"]', '123');
  84  |     await page.fill('input[name="confirmPassword"]', '123');
  85  |     await page.click('button[type="submit"]');
  86  |     
  87  |     // Check for minlength validation
  88  |     await expect(page.locator('input[name="password"]:invalid')).toBeVisible();
  89  |   });
  90  | });
  91  | 
  92  | test.describe('Logout', () => {
  93  |   test('should logout successfully', async ({ page }) => {
  94  |     // Login first
  95  |     await page.goto('/login');
  96  |     await page.fill('input[id="email"][type="email"]', TEST_STUDENT.email);
  97  |     await page.fill('input[id="password"][type="password"]', TEST_STUDENT.password);
  98  |     await page.click('button[type="submit"]');
  99  |     await expect(page).toHaveURL('/');
  100 |     
  101 |     // Find and click logout button (in navbar user menu)
  102 |     await page.click('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")');
  103 |     
  104 |     // Should redirect to login or home
  105 |     await expect(page.locator('h1')).toContainText('Iniciar sesión');
  106 |   });
  107 | });
```