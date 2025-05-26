import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

const App = function() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute requireAuth={false}>
            <Landing />
          </ProtectedRoute>
        } />
        <Route path="/signup" element={
          <ProtectedRoute requireAuth={false}>
            <Signup />
          </ProtectedRoute>
        } />
        <Route path="/login" element={
          <ProtectedRoute requireAuth={false}>
            <Login />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute requireAuth={true}>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;