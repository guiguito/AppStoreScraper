import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';
import { 
  Chip, 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  IconButton,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AppsIcon from '@mui/icons-material/Apps';
import BusinessIcon from '@mui/icons-material/Business';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import TheatersIcon from '@mui/icons-material/Theaters';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LifestyleIcon from '@mui/icons-material/Spa';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import WorkIcon from '@mui/icons-material/Work';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import SportsIcon from '@mui/icons-material/Sports';
import CasinoIcon from '@mui/icons-material/Casino';
import ExtensionIcon from '@mui/icons-material/Extension';

// App Store categories separated into Apps and Games
const appStoreAppsCategories = [
  { id: 6000, name: 'Business', icon: <BusinessIcon /> },
  { id: 6018, name: 'Books', icon: <MenuBookIcon /> },
  { id: 6017, name: 'Education', icon: <SchoolIcon /> },
  { id: 6016, name: 'Entertainment', icon: <TheatersIcon /> },
  { id: 6015, name: 'Finance', icon: <AccountBalanceIcon /> },
  { id: 6023, name: 'Food & Drink', icon: <RestaurantIcon /> },
  { id: 6013, name: 'Health & Fitness', icon: <FitnessCenterIcon /> },
  { id: 6012, name: 'Lifestyle', icon: <LifestyleIcon /> },
  { id: 6020, name: 'Medical', icon: <LocalHospitalIcon /> },
  { id: 6011, name: 'Music', icon: <MusicNoteIcon /> },
  { id: 6008, name: 'Photo & Video', icon: <PhotoCameraIcon /> },
  { id: 6007, name: 'Productivity', icon: <WorkIcon /> },
  { id: 6024, name: 'Shopping', icon: <ShoppingCartIcon /> },
  { id: 6005, name: 'Social', icon: <AppsIcon /> }
];

const appStoreGamesCategories = [
  { id: 6014, name: 'Games', icon: <SportsEsportsIcon /> },
  { id: 7001, name: 'Action', icon: <VideogameAssetIcon /> },
  { id: 7002, name: 'Adventure', icon: <ExtensionIcon /> },
  { id: 7003, name: 'Casual', icon: <CasinoIcon /> },
  { id: 7004, name: 'Board', icon: <ExtensionIcon /> },
  { id: 7005, name: 'Card', icon: <CasinoIcon /> },
  { id: 7006, name: 'Casino', icon: <CasinoIcon /> },
  { id: 7007, name: 'Dice', icon: <CasinoIcon /> },
  { id: 7008, name: 'Educational', icon: <SchoolIcon /> },
  { id: 7009, name: 'Family', icon: <SmartToyIcon /> },
  { id: 7010, name: 'Kids', icon: <SmartToyIcon /> },
  { id: 7011, name: 'Music', icon: <MusicNoteIcon /> },
  { id: 7012, name: 'Puzzle', icon: <ExtensionIcon /> },
  { id: 7013, name: 'Racing', icon: <SportsIcon /> },
  { id: 7014, name: 'Role Playing', icon: <SmartToyIcon /> },
  { id: 7015, name: 'Simulation', icon: <VideogameAssetIcon /> },
  { id: 7016, name: 'Sports', icon: <SportsIcon /> },
  { id: 7017, name: 'Strategy', icon: <ExtensionIcon /> },
  { id: 7018, name: 'Trivia', icon: <ExtensionIcon /> },
  { id: 7019, name: 'Word', icon: <ExtensionIcon /> }
];

// Combine for backward compatibility
const appStoreCategories = [...appStoreAppsCategories, ...appStoreGamesCategories];

// Play Store categories separated into Apps and Games
const playStoreAppsCategories = [
  { id: 'APPLICATION', name: 'Applications', icon: <AppsIcon /> },
  { id: 'ART_AND_DESIGN', name: 'Art & Design', icon: <PhotoCameraIcon /> },
  { id: 'AUTO_AND_VEHICLES', name: 'Auto & Vehicles', icon: <BusinessIcon /> },
  { id: 'BEAUTY', name: 'Beauty', icon: <LifestyleIcon /> },
  { id: 'BOOKS_AND_REFERENCE', name: 'Books', icon: <MenuBookIcon /> },
  { id: 'BUSINESS', name: 'Business', icon: <BusinessIcon /> },
  { id: 'COMICS', name: 'Comics', icon: <MenuBookIcon /> },
  { id: 'COMMUNICATION', name: 'Communication', icon: <AppsIcon /> },
  { id: 'DATING', name: 'Dating', icon: <LifestyleIcon /> },
  { id: 'EDUCATION', name: 'Education', icon: <SchoolIcon /> },
  { id: 'ENTERTAINMENT', name: 'Entertainment', icon: <TheatersIcon /> },
  { id: 'EVENTS', name: 'Events', icon: <TheatersIcon /> },
  { id: 'FINANCE', name: 'Finance', icon: <AccountBalanceIcon /> },
  { id: 'FOOD_AND_DRINK', name: 'Food & Drink', icon: <RestaurantIcon /> },
  { id: 'HEALTH_AND_FITNESS', name: 'Health & Fitness', icon: <FitnessCenterIcon /> },
  { id: 'HOUSE_AND_HOME', name: 'House & Home', icon: <LifestyleIcon /> },
  { id: 'LIFESTYLE', name: 'Lifestyle', icon: <LifestyleIcon /> },
  { id: 'MAPS_AND_NAVIGATION', name: 'Maps & Navigation', icon: <AppsIcon /> },
  { id: 'MEDICAL', name: 'Medical', icon: <LocalHospitalIcon /> },
  { id: 'MUSIC_AND_AUDIO', name: 'Music', icon: <MusicNoteIcon /> },
  { id: 'NEWS_AND_MAGAZINES', name: 'News & Magazines', icon: <MenuBookIcon /> },
  { id: 'PARENTING', name: 'Parenting', icon: <LifestyleIcon /> },
  { id: 'PERSONALIZATION', name: 'Personalization', icon: <LifestyleIcon /> },
  { id: 'PHOTOGRAPHY', name: 'Photography', icon: <PhotoCameraIcon /> },
  { id: 'PRODUCTIVITY', name: 'Productivity', icon: <WorkIcon /> },
  { id: 'SHOPPING', name: 'Shopping', icon: <ShoppingCartIcon /> },
  { id: 'SOCIAL', name: 'Social', icon: <AppsIcon /> },
  { id: 'SPORTS', name: 'Sports', icon: <SportsIcon /> },
  { id: 'TOOLS', name: 'Tools', icon: <WorkIcon /> },
  { id: 'TRAVEL_AND_LOCAL', name: 'Travel & Local', icon: <AppsIcon /> },
  { id: 'VIDEO_PLAYERS', name: 'Video Players', icon: <TheatersIcon /> },
  { id: 'WEATHER', name: 'Weather', icon: <AppsIcon /> }
];

const playStoreGamesCategories = [
  { id: 'GAME', name: 'Games', icon: <SportsEsportsIcon /> },
  { id: 'GAME_ACTION', name: 'Action', icon: <VideogameAssetIcon /> },
  { id: 'GAME_ADVENTURE', name: 'Adventure', icon: <VideogameAssetIcon /> },
  { id: 'GAME_ARCADE', name: 'Arcade', icon: <VideogameAssetIcon /> },
  { id: 'GAME_BOARD', name: 'Board', icon: <ExtensionIcon /> },
  { id: 'GAME_CARD', name: 'Card', icon: <CasinoIcon /> },
  { id: 'GAME_CASINO', name: 'Casino', icon: <CasinoIcon /> },
  { id: 'GAME_CASUAL', name: 'Casual', icon: <SmartToyIcon /> },
  { id: 'GAME_EDUCATIONAL', name: 'Educational', icon: <SchoolIcon /> },
  { id: 'GAME_MUSIC', name: 'Music', icon: <MusicNoteIcon /> },
  { id: 'GAME_PUZZLE', name: 'Puzzle', icon: <ExtensionIcon /> },
  { id: 'GAME_RACING', name: 'Racing', icon: <SportsIcon /> },
  { id: 'GAME_ROLE_PLAYING', name: 'Role Playing', icon: <SmartToyIcon /> },
  { id: 'GAME_SIMULATION', name: 'Simulation', icon: <VideogameAssetIcon /> },
  { id: 'GAME_SPORTS', name: 'Sports', icon: <SportsIcon /> },
  { id: 'GAME_STRATEGY', name: 'Strategy', icon: <ExtensionIcon /> },
  { id: 'GAME_TRIVIA', name: 'Trivia', icon: <ExtensionIcon /> },
  { id: 'GAME_WORD', name: 'Word', icon: <ExtensionIcon /> },
  { id: 'FAMILY', name: 'Family', icon: <SmartToyIcon /> }
];

// Combine for backward compatibility
const playStoreCategories = [...playStoreAppsCategories, ...playStoreGamesCategories];

function CategoryChips({ country, selectedStore }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState([]);

  const renderAppCard = (app, position) => app && (
    <Grid item xs={12} sm={6} md={4} lg={2.4} key={app.id}>
      <Card
        sx={{
          cursor: 'pointer',
          height: '100%',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => navigate(`/app/${selectedStore}/${app.id}?country=${country}`)}
      >
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Avatar
              src={app.icon}
              alt={app.title}
              variant="rounded"
              sx={{ width: 64, height: 64 }}
            />
            <Typography 
              variant="subtitle2" 
              align="center" 
              sx={{ 
                minHeight: '2.4em',
                lineHeight: '1.2em',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {`#${position + 1} ${app.title}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {app.developer}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/category-apps/${selectedStore}`, {
        categoryId: category.id,
        country: country,
        lang: 'en',
        limit: 100
      }));
      const data = await response.json();
      setApps(data);
    } catch (error) {
      console.error('Error fetching category apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setApps([]);
  };

  return (
    <Box>
      {selectedStore === 'appstore' ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 4, mb: 2 }}>
            <AppsIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" gutterBottom sx={{ 
              color: 'primary.main',
              fontWeight: 600,
              letterSpacing: '0.02em',
              mb: 0
            }}>
              Apps
            </Typography>
          </Box>
          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 4, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              justifyContent: 'center',
              '& .MuiChip-root': {
                m: 0.5
              }
            }}>
              {appStoreAppsCategories.map((category) => (
                <Chip
                  key={category.id}
                  icon={category.icon}
                  label={category.name}
                  onClick={() => handleCategoryClick(category)}
                  sx={{
                    '& .MuiChip-label': {
                      pl: 2
                    },
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '& .MuiSvgIcon-root': {
                        color: 'white'
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Paper>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 4, mb: 2 }}>
            <SportsEsportsIcon sx={{ color: 'secondary.main', mr: 1 }} />
            <Typography variant="h6" gutterBottom sx={{ 
              color: 'secondary.main',
              fontWeight: 600,
              letterSpacing: '0.02em',
              mb: 0
            }}>
              Games
            </Typography>
          </Box>
          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 4, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              justifyContent: 'center',
              '& .MuiChip-root': {
                m: 0.5
              }
            }}>
              {appStoreGamesCategories.map((category) => (
                <Chip
                  key={category.id}
                  icon={category.icon}
                  label={category.name}
                  onClick={() => handleCategoryClick(category)}
                  sx={{
                    '& .MuiChip-label': {
                      pl: 2
                    },
                    '&:hover': {
                      backgroundColor: 'secondary.main',
                      color: 'white',
                      '& .MuiSvgIcon-root': {
                        color: 'white'
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Paper>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 4, mb: 2 }}>
            <AppsIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" gutterBottom sx={{ 
              color: 'primary.main',
              fontWeight: 600,
              letterSpacing: '0.02em',
              mb: 0
            }}>
              Apps
            </Typography>
          </Box>
          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 4, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              justifyContent: 'center',
              '& .MuiChip-root': {
                m: 0.5
              }
            }}>
              {playStoreAppsCategories.map((category) => (
                <Chip
                  key={category.id}
                  icon={category.icon}
                  label={category.name}
                  onClick={() => handleCategoryClick(category)}
                  sx={{
                    '& .MuiChip-label': {
                      pl: 2
                    },
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '& .MuiSvgIcon-root': {
                        color: 'white'
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Paper>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 4, mb: 2 }}>
            <SportsEsportsIcon sx={{ color: 'secondary.main', mr: 1 }} />
            <Typography variant="h6" gutterBottom sx={{ 
              color: 'secondary.main',
              fontWeight: 600,
              letterSpacing: '0.02em',
              mb: 0
            }}>
              Games
            </Typography>
          </Box>
          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 4, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              justifyContent: 'center',
              '& .MuiChip-root': {
                m: 0.5
              }
            }}>
              {playStoreGamesCategories.map((category) => (
                <Chip
                  key={category.id}
                  icon={category.icon}
                  label={category.name}
                  onClick={() => handleCategoryClick(category)}
                  sx={{
                    '& .MuiChip-label': {
                      pl: 2
                    },
                    '&:hover': {
                      backgroundColor: 'secondary.main',
                      color: 'white',
                      '& .MuiSvgIcon-root': {
                        color: 'white'
                      }
                    }
                  }}
                />
              ))}
            </Box>
          </Paper>
        </>
      )}
      

      <Dialog
        open={Boolean(selectedCategory)}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {selectedCategory?.name} Apps
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {apps.map((app, index) => renderAppCard(app, index))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default CategoryChips;
