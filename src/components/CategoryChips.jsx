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
  Avatar
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

const appStoreCategories = [
  { id: 6000, name: 'Business', icon: <BusinessIcon /> },
  { id: 6018, name: 'Books', icon: <MenuBookIcon /> },
  { id: 6017, name: 'Education', icon: <SchoolIcon /> },
  { id: 6016, name: 'Entertainment', icon: <TheatersIcon /> },
  { id: 6015, name: 'Finance', icon: <AccountBalanceIcon /> },
  { id: 6023, name: 'Food & Drink', icon: <RestaurantIcon /> },
  { id: 6014, name: 'Games', icon: <SportsEsportsIcon /> },
  { id: 6013, name: 'Health & Fitness', icon: <FitnessCenterIcon /> },
  { id: 6012, name: 'Lifestyle', icon: <LifestyleIcon /> },
  { id: 6020, name: 'Medical', icon: <LocalHospitalIcon /> },
  { id: 6011, name: 'Music', icon: <MusicNoteIcon /> },
  { id: 6008, name: 'Photo & Video', icon: <PhotoCameraIcon /> },
  { id: 6007, name: 'Productivity', icon: <WorkIcon /> },
  { id: 6024, name: 'Shopping', icon: <ShoppingCartIcon /> },
  { id: 6005, name: 'Social', icon: <AppsIcon /> }
];

const playStoreCategories = [
  { id: 'BUSINESS', name: 'Business', icon: <BusinessIcon /> },
  { id: 'BOOKS_AND_REFERENCE', name: 'Books', icon: <MenuBookIcon /> },
  { id: 'EDUCATION', name: 'Education', icon: <SchoolIcon /> },
  { id: 'ENTERTAINMENT', name: 'Entertainment', icon: <TheatersIcon /> },
  { id: 'FINANCE', name: 'Finance', icon: <AccountBalanceIcon /> },
  { id: 'FOOD_AND_DRINK', name: 'Food & Drink', icon: <RestaurantIcon /> },
  { id: 'GAME', name: 'Games', icon: <SportsEsportsIcon /> },
  { id: 'HEALTH_AND_FITNESS', name: 'Health & Fitness', icon: <FitnessCenterIcon /> },
  { id: 'LIFESTYLE', name: 'Lifestyle', icon: <LifestyleIcon /> },
  { id: 'MEDICAL', name: 'Medical', icon: <LocalHospitalIcon /> },
  { id: 'MUSIC_AND_AUDIO', name: 'Music', icon: <MusicNoteIcon /> },
  { id: 'PHOTOGRAPHY', name: 'Photography', icon: <PhotoCameraIcon /> },
  { id: 'PRODUCTIVITY', name: 'Productivity', icon: <WorkIcon /> },
  { id: 'SHOPPING', name: 'Shopping', icon: <ShoppingCartIcon /> },
  { id: 'SOCIAL', name: 'Social', icon: <AppsIcon /> }
];

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
      <Typography variant="h6" gutterBottom sx={{ 
        mt: 4, 
        mb: 2,
        color: 'primary.main',
        fontWeight: 600,
        letterSpacing: '0.02em'
      }}>
        Popular Categories
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        justifyContent: 'center',
        '& .MuiChip-root': {
          m: 0.5
        }
      }}>
        {(selectedStore === 'appstore' ? appStoreCategories : playStoreCategories).map((category) => (
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
