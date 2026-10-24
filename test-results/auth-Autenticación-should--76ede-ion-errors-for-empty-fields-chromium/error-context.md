# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Autenticación >> should show validation errors for empty fields
- Location: e2e\auth.spec.ts:26:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]')
    - locator resolved to <button type="submit">Reload</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <nextjs-portal></nextjs-portal> from <script data-nextjs-dev-overlay="true">…</script> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <nextjs-portal></nextjs-portal> from <script data-nextjs-dev-overlay="true">…</script> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    48 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <nextjs-portal></nextjs-portal> from <script data-nextjs-dev-overlay="true">…</script> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [active]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - navigation [ref=e7]:
          - button [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - generic [ref=e11]:
            - generic [ref=e12]: 1/
            - generic [ref=e13]: "1"
          - button [disabled] [ref=e14]:
            - img "next" [ref=e15]
        - link "Next.js 16.4.2 (stale) Turbopack" [ref=e18] [cursor=pointer]:
          - /url: https://nextjs.org/docs/messages/version-staleness
          - generic "There is a newer version (16.4.3) available, upgrade recommended!" [ref=e21]: Next.js 16.4.2 (stale)
          - generic [ref=e22]: Turbopack
      - dialog "Runtime Error" [ref=e24]:
        - generic [ref=e27]:
          - generic [ref=e29]:
            - generic [ref=e30]:
              - generic [ref=e31]:
                - generic [ref=e32]: Runtime Error
                - generic [ref=e33]: Server
              - generic [ref=e34]:
                - button "Copy Error Info" [ref=e35] [cursor=pointer]
                - button "No related documentation found" [disabled] [ref=e38]
                - button "Attach Node.js inspector" [ref=e41] [cursor=pointer]
            - generic [ref=e50]: "Event handlers cannot be passed to Client Component props. <button type=\"button\" onClick={function onClick} className=... children=...> ^^^^^^^^^^^^^^^^^^ If you need interactivity, consider converting part of this to a Client Component."
          - generic [ref=e54]:
            - paragraph [ref=e55]:
              - text: Call Stack
              - generic [ref=e56]: "5"
            - button "Show 5 ignore-listed frame(s)" [ref=e57] [cursor=pointer]
    - generic [ref=e64] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e65]
      - generic [ref=e69]:
        - button "Open issues overlay" [ref=e70]:
          - generic [ref=e71]:
            - generic [aria-hidden] [ref=e72]: "0"
            - generic [ref=e73]: "1"
          - generic [ref=e74]: Issue
        - button "Collapse issues badge" [ref=e75]
  - generic [ref=e79]:
    - heading "This page couldn’t load" [level=1] [ref=e82]
    - paragraph [ref=e83]: A server error occurred. Reload to try again.
    - button "Reload" [ref=e86] [cursor=pointer]
  - paragraph [ref=e87]: ERROR 1869144877
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
> 27  |     await page.click('button[type="submit"]');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
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
  78  |     await expect(page.locator('text=/coinciden|match|igual/i')).toBeVisible({ timeout: 5000 });
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