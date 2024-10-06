// src/components/BetForm.js

import React, { useState } from 'react';

function BetForm({ bets, setBets }) {
  const [formData, setFormData] = useState({
    book: '',
    betAmount: '',
    oddsType: 'american',
    oddsValue: '',
  });

  const [calculationResult, setCalculationResult] = useState(null);

  const calculateWinnings = () => {
    const betAmount = parseFloat(formData.betAmount);
    const oddsType = formData.oddsType;
    const oddsValue = formData.oddsValue;

    if (isNaN(betAmount) || !oddsValue) {
      alert('Please enter valid bet amount and odds.');
      return;
    }

    try {
      const { profit, totalReturn } = calculateWinningsLogic(oddsValue, betAmount, oddsType);
      setCalculationResult({ profit, totalReturn });
    } catch (error) {
      alert(error.message);
    }
  };

  const calculateWinningsLogic = (odds, stake, oddsType) => {
    let profit = 0;

    switch (oddsType) {
      case 'american':
        profit = calculateAmericanOdds(odds, stake);
        break;
      case 'decimal':
        profit = calculateDecimalOdds(odds, stake);
        break;
      case 'fractional':
        profit = calculateFractionalOdds(odds, stake);
        break;
      default:
        throw new Error('Invalid odds type');
    }

    return {
      profit: parseFloat(profit.toFixed(2)),
      totalReturn: parseFloat((profit + stake).toFixed(2)),
    };
  };

  const calculateAmericanOdds = (odds, stake) => {
    let profit;
    odds = parseFloat(odds);
    if (odds > 0) {
      profit = (odds / 100) * stake;
    } else if (odds < 0) {
      profit = (100 / Math.abs(odds)) * stake;
    } else {
      throw new Error('American odds cannot be zero.');
    }
    return profit;
  };

  const calculateDecimalOdds = (odds, stake) => {
    odds = parseFloat(odds);
    if (odds <= 1) {
      throw new Error('Decimal odds must be greater than 1.');
    }
    let profit = (odds * stake) - stake;
    return profit;
  };

  const calculateFractionalOdds = (odds, stake) => {
    let [numerator, denominator] = odds.split('/').map(Number);
    if (!denominator || denominator === 0) {
      throw new Error('Invalid fractional odds.');
    }
    let profit = (numerator / denominator) * stake;
    return profit;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!calculationResult) {
      alert('Please calculate winnings before adding the bet.');
      return;
    }

    const newBet = {
      id: Date.now().toString(),
      ...formData,
      betAmount: parseFloat(formData.betAmount),
      profit: calculationResult.profit,
      totalReturn: calculationResult.totalReturn,
      status: 'pending',
      datePlaced: new Date().toISOString().split('T')[0],
    };

    setBets([...bets, newBet]);
    setFormData({
      book: '',
      betAmount: '',
      oddsType: 'american',
      oddsValue: '',
    });
    setCalculationResult(null);
  };

  return (
    <div className="bet-form">
      <h2>Add New Bet</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Book:
          <select
            value={formData.book}
            onChange={(e) => setFormData({ ...formData, book: e.target.value })}
            required
          >
            <option value="">--Select Book--</option>
            <option value="Fliff">Fliff</option>
            <option value="DraftKings">DraftKings</option>
            <option value="BetOnline">BetOnline</option>
            <option value="Novig">Novig</option>
          </select>
        </label>

        <label>
          Bet Amount ($):
          <input
            type="number"
            value={formData.betAmount}
            onChange={(e) => setFormData({ ...formData, betAmount: e.target.value })}
            required
          />
        </label>

        <label>
          Odds Type:
          <select
            value={formData.oddsType}
            onChange={(e) => setFormData({ ...formData, oddsType: e.target.value })}
          >
            <option value="american">American</option>
            <option value="decimal">Decimal</option>
            <option value="fractional">Fractional</option>
          </select>
        </label>

        <label>
          Odds Value:
          <input
            type="text"
            value={formData.oddsValue}
            onChange={(e) => setFormData({ ...formData, oddsValue: e.target.value })}
            required
          />
        </label>

        <button type="button" onClick={calculateWinnings}>
          Calculate Winnings
        </button>

        {calculationResult && (
          <div className="calculation-result">
            <p>Potential Profit: ${calculationResult.profit}</p>
            <p>Total Return: ${calculationResult.totalReturn}</p>
          </div>
        )}

        <button type="submit">Add Bet</button>
      </form>
    </div>
  );
}

export default BetForm;