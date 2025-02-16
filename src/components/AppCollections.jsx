import React, { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, Avatar, Box, Skeleton, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useApiWithCache } from '../hooks/useApiWithCache';

const appStoreCollections = [
  { id: 'topfreeapplications', title: 'Top Free Apps' },
  { id: 'topgrossingapplications', title: 'Top Grossing' },
  { id: 'toppaidapplications', title: 'Top Paid Apps' },
  { id: 'newapplications', title: 'New Apps' },
  { id: 'newfreeapplications', title: 'New Free Apps' },
  { id: 'newpaidapplications', title: 'New Paid Apps' }
];

const playStoreCollections = [
  { id: 'topselling_free', title: 'Top Free Apps' },
  { id: 'topselling_paid', title: 'Top Paid Apps' },
  { id: 'topgrossing', title: 'Top Grossing' }
];

function AppCollections({ country, selectedStore }) {
  const navigate = useNavigate();
  // Define all useState hooks first
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);

  const handleAppClick = (appId) => {
    if (!appId) return;
    navigate(`/app/${selectedStore}/${appId}?country=${country}`);
  };

  const renderAppCard = (app, position) => app && typeof app === 'object' && (app.id || app.appId) && (
    <Grid item xs={12} sm={6} md={4} lg={2.4} key={app.id || app.appId}>
      <Card
        sx={{
          cursor: 'pointer',
          height: '100%',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => handleAppClick(app.id || app.appId)}
      >
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Avatar
              src={app.icon || ''}
              alt={app.title || 'App'}
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
              {`#${position + 1} ${app.title || 'Untitled App'}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {app.developer || 'Unknown Developer'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderSkeleton = () => (
    <Grid item xs={12} sm={6} md={4} lg={2.4}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Skeleton variant="rounded" width={64} height={64} />
            <Skeleton width="80%" />
            <Skeleton width="60%" />
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  function CollectionGroup({ collection, country, selectedStore, onAppClick }) {
    const { data, loading, error } = useApiWithCache(
      `/collection/${selectedStore}/${collection.id.toLowerCase()}`,
      { country, limit: 10 }
    );

    return (
      <Box sx={{ mb: { xs: 4, sm: 6 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: '0.02em' }}>
            {collection.title}
          </Typography>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { color: 'primary.main' }
            }}
            onClick={() => {
              setSelectedCollection({ id: collection.id, title: collection.title });
              setModalOpen(true);
            }}
          >
            View all
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {loading && [1, 2, 3, 4, 5, 6].map(i => <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>)}
          {!loading && data && data.map((app, index) => renderAppCard(app, index))}
        </Grid>
      </Box>
    );
  }

  function CollectionModal({ collection, country, selectedStore, onAppClick, renderSkeleton }) {
    const { data, loading } = useApiWithCache(
      `/collection/${selectedStore}/${collection.id.toLowerCase()}`,
      { country, limit: 100 }
    );

    return (
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {loading && [1, 2, 3, 4, 5, 6, 7, 8].map(i => <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>)}
          {!loading && data && data.map((app, index) => renderAppCard(app, index))}
        </Grid>
      </DialogContent>
    );
  }

  const collections = selectedStore === 'appstore' ? appStoreCollections : playStoreCollections || [];

  return (
    <>
      <Box sx={{ my: { xs: 4, sm: 6 } }}>
        {collections.map(collection => (
          <CollectionGroup
            key={collection.id}
            collection={collection}
            country={country}
            selectedStore={selectedStore}
            onAppClick={handleAppClick}
          />
        ))}
      </Box>
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedCollection?.title}
          <IconButton
            onClick={() => setModalOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selectedCollection && (
          <CollectionModal 
             collection={selectedCollection} 
             country={country} 
             selectedStore={selectedStore} 
             onAppClick={handleAppClick}
             renderSkeleton={renderSkeleton}
          />
        )}
      </Dialog>
    </>
  );
}

export default AppCollections;
