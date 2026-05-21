# Booked™ — Frontend

React 18 + Vite + Tailwind + anime.js + react-router-dom.

## Ejecutar

```bash
cd frontend
npm install
npm run dev
```

Por defecto: `http://localhost:3000` (proxy de `/api` y `/storage` a `http://localhost:4000`).

## Estructura

```
src/
├─ api/client.js              Wrapper fetch + mini-redirecciones 400/500
├─ components/
│  ├─ animations/animations.js  Anime.js helpers
│  ├─ Header.jsx Footer.jsx ...
├─ context/
│  ├─ AuthContext.jsx   ToastContext.jsx   ThemeContext.jsx
├─ pages/
│  ├─ Home, Explore, Book, BookEdit, Author, Collection, Announcements,
│  │  Login, Register, Profile, Admin, AdminModeration, ErrorPages
└─ styles/index.css           Tailwind + variables del tema
```

## Tema claro / oscuro

- Claro:  fondo `#F5E9D4` (pergamino), texto `#1F2937`.
- Oscuro: fondo `#2B2F33` (grisáceo), texto `#E6E7E8`.
- Se persiste en `localStorage` (`booked.theme`).
