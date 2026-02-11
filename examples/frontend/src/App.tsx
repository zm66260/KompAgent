import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/Home";
import { ChatPage } from "@/pages/Chat";
import { SpatialPage } from "@/pages/Spatial";
import { DevicePage } from "@/pages/Device";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/spatial" element={<SpatialPage />} />
        <Route path="/device" element={<DevicePage />} />
      </Routes>
    </Layout>
  );
}

export default App;
