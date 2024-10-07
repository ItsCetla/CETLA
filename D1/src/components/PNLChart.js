// src/components/PNLChart.js

import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';

Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function PNLChart({ bets }) {
  const ChartData = () => {
    // Filter bets with status 'hit', 'miss', or 'push'
    const settledBets = bets.filter((bet) => bet.status !== 'pending');

    // Sort bets by datePlaced
    settledBets.sort((a, b) => new Date(a.datePlaced) - new Date(b.datePlaced));

    const dates = [];
    const pnlData = [];

    let cumulativePNL = 0;

    settledBets.forEach((bet) => {
      const date = bet.datePlaced;
      let profitOrLoss = 0;

      if (bet.status === 'hit') {
        profitOrLoss = bet.profit;
      } else if (bet.status === 'miss') {
        profitOrLoss = -bet.betAmount;
      } else if (bet.status === 'push') {
        profitOrLoss = 0;
      }

      cumulativePNL += profitOrLoss;

      dates.push(date);
      pnlData.push(cumulativePNL.toFixed(2));
    });

    return {
      labels: dates,
      datasets: [
        {
          label: 'Cumulative P&L',
          data: pnlData,
          fill: false,
          backgroundColor: 'rgb(75,192,192)',
          borderColor: 'rgba(75,192,192,1)',
          tension: 0.1,
        },
      ],
    };
  };

  return (
    <div className="pnl-chart">
      <h2>Profit & Loss Chart</h2>
      <Line data={ChartData()} />
    </div>
  );
}

export default PNLChart;