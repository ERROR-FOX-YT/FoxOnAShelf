import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import Book from './pages/Book.jsx';
import Author from './pages/Author.jsx';
import Collection from './pages/Collection.jsx';
import Anuncios from './pages/Anuncios.jsx';
import Changelog from './pages/Changelog.jsx';
import DualAuth from './pages/DualAuth.jsx';
import Profile from './pages/Profile.jsx';
import Equipo from './pages/Equipo.jsx';
import Foros from './pages/Foros.jsx';
import ForoCategoria from './pages/ForoCategoria.jsx';
import { Error400, Error404, Error500 } from './pages/ErrorPages.jsx';
import DevAccountSwitcher from './components/DevAccountSwitcher.jsx';
import ServerBanner from './components/ServerBanner.jsx';

const Admin = lazy(() => import('./pages/Admin.jsx'));
const AdminModeration = lazy(() => import('./pages/AdminModeration.jsx'));
const ForoHilo = lazy(() => import('./pages/ForoHilo.jsx'));
const BookEdit = lazy(() => import('./pages/BookEdit.jsx'));
const MediaLibrary = lazy(() => import('./pages/MediaLibrary.jsx'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-foxBrown/20 border-t-foxBrown" />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ServerBanner />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/explore"           element={<Explore />} />
            <Route path="/book/:bookId"      element={<Book />} />
            <Route path="/book/:bookId/edit" element={<BookEdit />} />
            <Route path="/author/:authorId"  element={<Author />} />
            <Route path="/collections/:id"   element={<Collection />} />
            <Route path="/anuncios"          element={<Anuncios />} />
            <Route path="/login"             element={<DualAuth />} />
            <Route path="/register"          element={<DualAuth />} />
            <Route path="/profile"           element={<Profile />} />
            <Route path="/library"           element={<MediaLibrary />} />
            <Route path="/admin"             element={<Admin />} />
            <Route path="/admin/moderation"  element={<AdminModeration />} />
            <Route path="/changelog"         element={<Changelog />} />
            <Route path="/equipo"            element={<Equipo />} />
            <Route path="/foros"             element={<Foros />} />
            <Route path="/foros/:categoriaId" element={<ForoCategoria />} />
            <Route path="/foros/hilos/:hiloId" element={<ForoHilo />} />
            <Route path="/error/400"         element={<Error400 />} />
            <Route path="/error/404"         element={<Error404 />} />
            <Route path="/error/500"         element={<Error500 />} />
            <Route path="*"                  element={<Error404 />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <DevAccountSwitcher />
    </div>
  );
}
