import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import Book from './pages/Book.jsx';
import BookEdit from './pages/BookEdit.jsx';
import Author from './pages/Author.jsx';
import Collection from './pages/Collection.jsx';
import Announcements from './pages/Announcements.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import AdminModeration from './pages/AdminModeration.jsx';
import { Error400, Error404, Error500 } from './pages/ErrorPages.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/"                  element={<Home />} />
          <Route path="/explore"           element={<Explore />} />
          <Route path="/book/:bookId"      element={<Book />} />
          <Route path="/book/:bookId/edit" element={<BookEdit />} />
          <Route path="/author/:authorId"  element={<Author />} />
          <Route path="/collections/:id"   element={<Collection />} />
          <Route path="/announcements"     element={<Announcements />} />
          <Route path="/login"             element={<Login />} />
          <Route path="/register"          element={<Register />} />
          <Route path="/profile"           element={<Profile />} />
          <Route path="/admin"             element={<Admin />} />
          <Route path="/admin/moderation"  element={<AdminModeration />} />
          <Route path="/error/400"         element={<Error400 />} />
          <Route path="/error/404"         element={<Error404 />} />
          <Route path="/error/500"         element={<Error500 />} />
          <Route path="*"                  element={<Error404 />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
