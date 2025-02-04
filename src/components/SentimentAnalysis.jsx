import React from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  Positive: '#4caf50',  // Green
  Neutral: '#ff9800',   // Orange
  Negative: '#f44336',  // Red
};

function SentimentAnalysis({ data, loading, error }) {
  const containerStyle = {
    minHeight: 500, // Consistent height for all states
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  };
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Analyzing Reviews Sentiment...
          </Typography>
          <Box sx={{ width: '80%', maxWidth: 400 }}>
            <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Alert 
            severity="error" 
            sx={{ 
              width: '80%', 
              maxWidth: 400,
              '& .MuiAlert-message': { width: '100%' }
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              Error Analyzing Reviews
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          </Alert>
        </Box>
      );
    }

    if (!data) return null;

  const { SentimentDistribution = {}, TopIssues = [], Insights = {} } = data || {};

  // Prepare data for pie chart
  const pieData = Object.entries(SentimentDistribution || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const total = Object.values(SentimentDistribution || {}).reduce((a, b) => a + b, 0);

    return (
      <Box sx={{ flex: 1 }}>
      <Typography variant="h6" gutterBottom>
        Sentiment Analysis
      </Typography>

      {/* Distribution Chart */}
      <Box sx={{ height: 300, mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                labelLine={true}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} reviews`, 'Count']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          {pieData.map((entry, index) => (
            <Box key={`legend-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: COLORS[entry.name],
                  borderRadius: '50%'
                }}
              />
              <Typography variant="body2">
                {entry.name}: {entry.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Top Issues */}
      <Typography variant="h6" gutterBottom>
        Top Issues
      </Typography>
      <List>
        {(TopIssues || []).map((issue, index) => (
          <React.Fragment key={`issue-${index}`}>
            {index > 0 && <Divider component="li" />}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {issue.Issue}
                    <Chip
                      size="small"
                      label={`${issue.Mentions} mentions`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={issue.Description}
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Insights */}
      <Typography variant="h6" gutterBottom>
        Key Insights
      </Typography>
      <Typography variant="body1" paragraph>
        {Insights?.OverallSentiment || 'No overall sentiment available'}
      </Typography>
      <List dense>
        {(Insights?.KeyPatterns || []).map((pattern, index) => (
          <ListItem key={`pattern-${index}`}>
            <ListItemText primary={pattern} />
          </ListItem>
        ))}
      </List>
      </Box>
    );
  };

  return (
    <Paper sx={{ ...containerStyle, p: 2, mb: 3 }}>
      {renderContent()}
    </Paper>
  );
}

export default SentimentAnalysis;
