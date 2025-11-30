import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Player from './pages/Player';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deck/:deckId/edit" element={<Editor />} />
        <Route path="/deck/:deckId/play" element={<Player />} />
      </Routes>
    </Router>
  );
}

export default App;
