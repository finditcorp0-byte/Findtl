# FindIt Campus

MVP de **FindIt Campus** (repositorio `Findtl`): aplicación web con Next.js 16 y App Router,
TypeScript, Tailwind CSS v4 y ESLint 9. La integración con Supabase se añadirá en la fase
siguiente.

## Stack

| Pieza              | Versión / detalle                                  |
| ------------------ | -------------------------------------------------- |
| Next.js            | 16.4.2 (App Router, Turbopack)                     |
| React              | 19.3.0                                             |
| TypeScript         | 5.x (`strict: true`)                               |
| Tailwind CSS       | v4 (`@tailwindcss/turbopack`)                       |
| ESLint             | 9 (`eslint-config-next`: core-web-vitals + typescript) |
| Node.js            | >= 20.9 (probado con 24.19.0)                      |
| Gestor de paquetes | npm                                                |

## Requisitos

- Node.js 20.9 o superior
- npm 10 o superior

## Puesta en marcha

```bash
npm install
npm run dev
```

La aplicación queda disponible en <http://localhost:3000>.

## Scripts

| Script            | Descripción                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Servidor de desarrollo con Turbopack y HMR.      |
| `npm run build`   | Compilación de producción.                       |
| `npm run start`   | Sirve el build de producción.                    |
| `npm run lint`    | Ejecuta ESLint sobre el proyecto.                |

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores reales. `.env.local` está
ignorado por Git y no debe subirse nunca al repositorio.

```bash
copy .env.example .env.local
```

## Estructura

```
src/
  app/          # App Router: rutas, layout raíz y estilos globales
public/         # Recursos estáticos
```

El alias de importaciones `@/*` apunta a `src/*` (configurado en `tsconfig.json`).

## Convenciones de Git

- `.gitattributes` normaliza los finales de línea a LF en el repositorio.
- `.gitignore` excluye `node_modules/`, `.next/` y los archivos de entorno reales
  (`.env*`), manteniendo versionada la plantilla `.env.example`.
