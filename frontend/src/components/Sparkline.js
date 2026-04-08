import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getChartColor } from '@/lib/formatters';

export const Sparkline = ({ data, color, className }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.map(d => ({ value: d.value || d }));
  const strokeColor = color || getChartColor(0);

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Sparkline;