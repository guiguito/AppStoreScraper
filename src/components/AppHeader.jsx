import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Container } from '@mui/material';
import { Apps as AppsIcon } from '@mui/icons-material';


function AppHeader() {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Container>
        <Toolbar>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            <AppsIcon 
              sx={{ 
                mr: 1.5,
                fontSize: '2rem',
                color: 'primary.main'
              }} 
            />
            <Typography 
              variant="h6" 
              component="div"
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1A1A1A 30%, #666666 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              App Store Explorer
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default AppHeader;
