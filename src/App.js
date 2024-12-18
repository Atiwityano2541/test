
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BangkokMap from './Components/Mainmap';
import BangkokMapboundary from './Components/Mainmap_v1';


function App() {
 
  return (
    <Router>
      <Routes>
      <Route path="/" element={<BangkokMap />} /> 
        <Route path="/BangkokMap_boundary" element={<BangkokMapboundary />} /> 
        <Route path="/BangkokMap" element={<BangkokMap />} /> 
  
      </Routes>
    </Router>
  );
}
export default App;
