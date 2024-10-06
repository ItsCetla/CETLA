// src/App.js

import React, { useState, useEffect } from 'react';
import BetForm from './components/BetForm';
import BetList from './components/BetList';
import PNLChart from './components/PNLChart';
import './index.css';

function App() {
  const [bets, setBets] = useState([]);

  // Load bets from LocalStorage on initial render
  useEffect(() => {
    const storedBets = JSON.parse(localStorage.getItem('bets')) || [];
    setBets(storedBets);
  }, []);

  // Update LocalStorage whenever bets change
  useEffect(() => {
    localStorage.setItem('bets', JSON.stringify(bets));
  }, [bets]);

  return (
    <div className="App">
      <h1>Bet Tracker</h1>
      <BetForm bets={bets} setBets={setBets} />
      <BetList bets={bets} setBets={setBets} />
      <PNLChart bets={bets} />
    </div>
  );
}

export default App;