# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Panel Admin /admin >> should navigate to profile from quick actions
- Location: e2e\admin.spec.ts:60:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[id="email"][type="email"]')

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
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const TEST_ADMIN = {
  4  |   email: 'e2e.admin@utb.edu.co',
  5  |   password: 'TestPass123!',
  6  | };
  7  | 
  8  | test.describe('Panel Admin /admin', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Login as admin
  11 |     await page.goto('/login');
> 12 |     await page.fill('input[id="email"][type="email"]', TEST_ADMIN.email);
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  13 |     await page.fill('input[id="password"][type="password"]', TEST_ADMIN.password);
  14 |     await page.click('button[type="submit"]');
  15 |     await page.waitForURL('/');
  16 |   });
  17 | 
  18 |   test('should access admin panel', async ({ page }) => {
  19 |     await page.goto('/admin');
  20 |     await expect(page.locator('h1')).toContainText('Panel de Administración');
  21 |   });
  22 | 
  23 |   test('should show pending reviews section', async ({ page }) => {
  24 |     await page.goto('/admin');
  25 |     await expect(page.locator('#pendientes-titulo')).toBeVisible();
  26 |     await expect(page.locator('text=Reclamaciones pendientes de revisión')).toBeVisible();
  27 |   });
  28 | 
  29 |   test('should show needs more info section', async ({ page }) => {
  30 |     await page.goto('/admin');
  31 |     await expect(page.locator('#necesitan-titulo')).toBeVisible();
  32 |   });
  33 | 
  34 |   test('should show pending deliveries section', async ({ page }) => {
  35 |     await page.goto('/admin');
  36 |     await expect(page.locator('#entregas-titulo')).toBeVisible();
  37 |   });
  38 | 
  39 |   test('should have quick actions in sidebar', async ({ page }) => {
  40 |     await page.goto('/admin');
  41 |     await expect(page.locator('text=Acciones rápidas')).toBeVisible();
  42 |     await expect(page.locator('a:has-text("Publicar objeto")')).toBeVisible();
  43 |     await expect(page.locator('a:has-text("Ver catálogo")')).toBeVisible();
  44 |     await expect(page.locator('a:has-text("Mi perfil")')).toBeVisible();
  45 |   });
  46 | 
  47 |   test('should navigate to publicar from quick actions', async ({ page }) => {
  48 |     await page.goto('/admin');
  49 |     await page.click('a:has-text("Publicar objeto")');
  50 |     await expect(page).toHaveURL('/publicar');
  51 |     await expect(page.locator('h1')).toContainText('Publica un objeto');
  52 |   });
  53 | 
  54 |   test('should navigate to catalog from quick actions', async ({ page }) => {
  55 |     await page.goto('/admin');
  56 |     await page.click('a:has-text("Ver catálogo")');
  57 |     await expect(page).toHaveURL('/objetos');
  58 |   });
  59 | 
  60 |   test('should navigate to profile from quick actions', async ({ page }) => {
  61 |     await page.goto('/admin');
  62 |     await page.click('a:has-text("Mi perfil")');
  63 |     await expect(page).toHaveURL('/perfil');
  64 |   });
  65 | });
  66 | 
  67 | test.describe('Admin access control', () => {
  68 |   test('should deny access to non-admin users', async ({ page }) => {
  69 |     // Login as student (non-admin)
  70 |     await page.goto('/login');
  71 |     await page.fill('input[id="email"][type="email"]', 'e2e.student@utb.edu.co');
  72 |     await page.fill('input[id="password"][type="password"]', 'TestPass123!');
  73 |     await page.click('button[type="submit"]');
  74 |     await page.waitForURL('/');
  75 |     
  76 |     // Try to access admin panel
  77 |     await page.goto('/admin');
  78 |     
  79 |     // Should get 404 (notFound) or redirect
  80 |     await expect(page.locator('h1')).toContainText('404');
  81 |   });
  82 | });
```