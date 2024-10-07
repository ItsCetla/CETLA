// src/components/BetList.js

import React from 'react';

function BetList({ bets, setBets }) {
  const updateBetStatus = (id, status) => {
    const updatedBets = bets.map((bet) =>
      bet.id === id ? { ...bet, status } : bet
    );
    setBets(updatedBets);
  };

  const deleteBet = (id) => {
    const updatedBets = bets.filter((bet) => bet.id !== id);
    setBets(updatedBets);
  };

  return (
    <div className="bet-list">
      <h2>Your Bets</h2>
      <table>
        <thead>
          <tr>
            <th>Book</th>
            <th>Bet Amount</th>
            <th>Odds</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <tr key={bet.id}>
              <td>{bet.book}</td>
              <td>${bet.betAmount.toFixed(2)}</td>
              <td>
                {bet.oddsType} ({bet.oddsValue})
              </td>
              <td>{bet.status}</td>
              <td>
                <button onClick={() => updateBetStatus(bet.id, 'hit')}>Hit</button>
                <button onClick={() => updateBetStatus(bet.id, 'miss')}>Miss</button>
                <button onClick={() => updateBetStatus(bet.id, 'push')}>Push</button>
                <button onClick={() => deleteBet(bet.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BetList;