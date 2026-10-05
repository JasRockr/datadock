import './App.css';
import CargaArchivoPage from './pages/CargaArchivoPage';
import AsesoresPage from './pages/AsesoresPage';
import NavBar from './components/NavBar';
import { AppProvider } from './context/AppContext';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <NavBar />
          <main className="flex-grow w-full max-w-full px-4 sm:px-6 lg:px-8 mx-auto py-6">
            <div className="w-full max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/asesores" />} />
                <Route path="/upload" element={<CargaArchivoPage />} />
                <Route path="/asesores" element={<AsesoresPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
