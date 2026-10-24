# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog.spec.ts >> Catálogo /objetos >> should show object cards with correct info
- Location: e2e\catalog.spec.ts:45:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Cargador MacBook Pro')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Cargador MacBook Pro') with timeout 5000ms
  - waiting for locator('text=Cargador MacBook Pro')

```

```yaml
- banner:
  - link "FindIt Campus":
    - /url: /
  - navigation "Navegación principal":
    - list:
      - listitem:
        - link "Inicio":
          - /url: /
      - listitem:
        - link "Objetos perdidos":
          - /url: /objetos?tipo=perdido
      - listitem:
        - link "Cómo funciona":
          - /url: /#como-funciona
      - listitem:
        - link "Sobre nosotros":
          - /url: /#sobre-nosotros
  - text: Selecciona la institución
  - combobox "Selecciona la institución":
    - option "Universidad de Cartagena" [selected]
    - option "UCAM Campus Cartagena"
    - option "Universidad de Córdoba"
    - option "Universidad del Norte"
    - option "Instituto Tecnológico de Bolívar"
  - button "Iniciar sesión"
  - button "Registrarse"
- main:
  - paragraph: Catalogo
  - heading "Objetos perdidos y encontrados" [level=1]
  - paragraph: Explora los objetos publicados en el campus. Filtra por tipo, categoria, zona o fecha para acotar la busqueda.
  - search:
    - text: Buscar objetos
    - searchbox "Buscar objetos"
    - button "Buscar"
  - complementary "Filtros del catálogo":
    - heading "Filtros" [level=2]
    - group "Tipo de registro":
      - text: Tipo de registro
      - radio "Todos" [checked]
      - text: Todos
      - radio "Perdidos"
      - text: Perdidos
      - radio "Encontrados"
      - text: Encontrados
    - text: Categoría
    - combobox "Categoría":
      - option "Todas las categorías" [selected]
      - option "Electrónicos"
      - option "Documentos"
      - option "Llaves"
      - option "Bolsos y morrales"
      - option "Ropa"
      - option "Accesorios"
      - option "Libros y útiles"
      - option "Otros"
    - text: Zona del campus
    - combobox "Zona del campus":
      - option "Todas las zonas" [selected]
      - option "Auditorio central"
      - option "Biblioteca central"
      - option "Cafetería principal"
      - option "Centro deportivo"
      - option "Edificio de ingeniería"
      - option "Estacionamiento occidental"
      - option "Laboratorios"
      - option "Recepción principal"
      - option "Sala de cómputo"
    - text: Institución
    - combobox "Institución":
      - option "Todas las instituciones" [selected]
      - option "Universidad de Cartagena"
      - option "UCAM Campus Cartagena"
      - option "Universidad de Córdoba"
      - option "Universidad del Norte"
      - option "Instituto Tecnológico de Bolívar"
    - text: Fecha de publicación
    - combobox "Fecha de publicación":
      - option "Cualquier fecha" [selected]
      - option "Hoy"
      - option "Últimos 7 días"
      - option "Últimos 15 días"
      - option "Último mes"
    - button "Limpiar filtros"
  - region "Resultados de la busqueda":
    - paragraph: 2 objetos encontrados
    - list:
      - listitem:
        - article:
          - text: Sin fotografía Perdido
          - paragraph: Otros
          - heading "Audífonos Sony WH-1000XM5" [level=3]:
            - link "Audífonos Sony WH-1000XM5":
              - /url: /objetos/e2e88888-8888-8888-8888-888888888888
          - paragraph: Biblioteca central · Sala de lectura 2do piso
          - paragraph: Hoy
          - paragraph: Ver detalle
      - listitem:
        - article:
          - text: Sin fotografía Perdido
          - paragraph: Electrónicos
          - heading "Audífonos perdidos" [level=3]:
            - link "Audífonos perdidos":
              - /url: /objetos/88888888-8888-8888-8888-888888888889
          - paragraph: Biblioteca · Sala B-204
          - paragraph: Ayer
          - paragraph: Ver detalle
- contentinfo:
  - text: FindIt Campus
  - paragraph: Plataforma institucional para registrar, encontrar y recuperar objetos perdidos dentro de comunidades educativas, con custodia centralizada y trazabilidad.
  - navigation "Secciones del sitio":
    - heading "Secciones" [level=2]
    - list:
      - listitem:
        - link "Inicio":
          - /url: /
      - listitem:
        - link "Objetos perdidos":
          - /url: /objetos?tipo=perdido
      - listitem:
        - link "Explorar objetos":
          - /url: /objetos
      - listitem:
        - link "Publicar un objeto":
          - /url: /publicar
      - listitem:
        - link "Cómo funciona":
          - /url: /#como-funciona
      - listitem:
        - link "Sobre nosotros":
          - /url: /#sobre-nosotros
  - navigation "Ayuda":
    - heading "Ayuda" [level=2]
    - list:
      - listitem:
        - link "Preguntas frecuentes":
          - /url: /#faq
      - listitem:
        - link "Confianza y seguridad":
          - /url: /#confianza
      - listitem:
        - link "Proceso de reclamación":
          - /url: /#como-funciona
      - listitem:
        - link "Créditos de imágenes":
          - /url: /credits.txt
  - heading "Instituciones" [level=2]
  - list:
    - listitem:
      - link "Universidad de Cartagena":
        - /url: /objetos?campus=un-cartagena
    - listitem:
      - link "UCAM Campus Cartagena":
        - /url: /objetos?campus=ucam
    - listitem:
      - link "Universidad de Córdoba":
        - /url: /objetos?campus=un-cordoba
    - listitem:
      - link "Universidad del Norte":
        - /url: /objetos?campus=un-norte
    - listitem:
      - link "Instituto Tecnológico de Bolívar":
        - /url: /objetos?campus=itb
  - paragraph: © 2026 FindIt Campus. Plataforma en desarrollo.
  - paragraph: "Interfaz de demostración: los objetos y sus datos son ficticios."
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Catálogo /objetos', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/objetos');
  6  |     await page.waitForLoadState('networkidle');
  7  |   });
  8  | 
  9  |   test('should load catalog page successfully', async ({ page }) => {
  10 |     await expect(page.locator('h1')).toContainText('Objetos perdidos y encontrados');
  11 |     await expect(page.locator('input[placeholder*="Busca"]')).toBeVisible();
  12 |   });
  13 | 
  14 |   test('should filter by type (lost/found)', async ({ page }) => {
  15 |     // The filters are radio buttons with labels
  16 |     await page.click('label:has-text("Perdidos")');
  17 |     await expect(page.locator('input[name="tipo-reporte"][value="lost"]')).toBeChecked();
  18 |     
  19 |     await page.click('label:has-text("Encontrados")');
  20 |     await expect(page.locator('input[name="tipo-reporte"][value="found"]')).toBeChecked();
  21 |     
  22 |     await page.click('label:has-text("Todos")');
  23 |     await expect(page.locator('input[name="tipo-reporte"][value="todos"]')).toBeChecked();
  24 |   });
  25 | 
  26 |   test('should filter by category', async ({ page }) => {
  27 |     // Category select dropdown
  28 |     await page.selectOption('#categoria-objeto', 'electronicos');
  29 |     await expect(page.locator('#categoria-objeto')).toHaveValue('electronicos');
  30 |   });
  31 | 
  32 |   test('should filter by campus/zone', async ({ page }) => {
  33 |     // Zone/Campus select dropdown - using the correct ID from the UI
  34 |     await page.selectOption('#zona-objeto', 'Biblioteca central');
  35 |     await expect(page.locator('#zona-objeto')).toHaveValue('Biblioteca central');
  36 |   });
  37 | 
  38 |   test('should search by text query', async ({ page }) => {
  39 |     await page.fill('input[placeholder*="Busca"]', 'Sony');
  40 |     await page.click('button:has-text("Buscar")');
  41 |     
  42 |     await expect(page.locator('text=Sony')).toBeVisible({ timeout: 5000 });
  43 |   });
  44 | 
  45 |   test('should show object cards with correct info', async ({ page }) => {
  46 |     // Check that our seeded objects are displayed
  47 |     await expect(page.locator('text=Audífonos Sony WH-1000XM5')).toBeVisible();
> 48 |     await expect(page.locator('text=Cargador MacBook Pro')).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  49 |   });
  50 | 
  51 |   test('should navigate to object detail on click', async ({ page }) => {
  52 |     // Click on the first object card (Audífonos)
  53 |     await page.click('article:has-text("Audífonos Sony WH-1000XM5") >> a');
  54 |     
  55 |     // Should navigate to detail page with UUID in URL
  56 |     await expect(page).toHaveURL(/\/objetos\/e2e88888-8888-8888-8888-888888888888/);
  57 |     await expect(page.locator('h1')).toContainText('Audífonos Sony WH-1000XM5');
  58 |   });
  59 | 
  60 |   test('should show published badge on published objects', async ({ page }) => {
  61 |     await expect(page.locator('text=Publicado')).toBeVisible();
  62 |   });
  63 | });
```