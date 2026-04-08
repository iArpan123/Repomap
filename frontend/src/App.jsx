import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AnalysisPage from "./pages/AnalysisPage";
import RepoBrowserPage from "./pages/RepoBrowserPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"                  element={<HomePage />} />
        <Route path="/repos"             element={<RepoBrowserPage />} />
        <Route path="/repo/:owner/:repo" element={<AnalysisPage />} />
      </Routes>
    </AuthProvider>
  );
}
