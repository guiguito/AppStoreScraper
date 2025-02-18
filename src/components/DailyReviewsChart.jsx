import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Paper, Typography } from '@mui/material';

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
};

function DailyReviewsChart({ reviews }) {
  const dailyData = useMemo(() => {
    // Create a map to count reviews by date
    const reviewsByDate = reviews.reduce((acc, review) => {
      try {
        // Try to parse the date from either updated, date, or submitTime field (Play Store)
        let reviewDate = review.updated || review.date;
        
        // Handle Play Store's submitTime (which is in milliseconds)
        if (!reviewDate && review.submitTime) {
          reviewDate = new Date(parseInt(review.submitTime)).toISOString();
        }
        
        if (!reviewDate) return acc;

        const date = new Date(reviewDate);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', reviewDate);
          return acc;
        }

        const dateStr = date.toISOString().split('T')[0];
        acc[dateStr] = (acc[dateStr] || 0) + 1;
      } catch (error) {
        console.warn('Error processing review date:', error);
      }
      return acc;
    }, {});

    // Convert to array and sort by date
    const data = Object.entries(reviewsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return data;
  }, [reviews]);

  if (dailyData.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Daily Reviews Count
      </Typography>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart
            data={dailyData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              interval="preserveStartEnd"
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={(value) => Math.round(value)}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <Tooltip
              labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              formatter={(value) => [`${value} review${value === 1 ? '' : 's'}`, 'Count']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '8px 12px'
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#1976d2"
              fill="#1976d2"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{
                stroke: '#1976d2',
                strokeWidth: 2,
                r: 3,
                fill: '#fff'
              }}
              activeDot={{
                stroke: '#1976d2',
                strokeWidth: 2,
                r: 5,
                fill: '#fff'
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}

export default DailyReviewsChart;
