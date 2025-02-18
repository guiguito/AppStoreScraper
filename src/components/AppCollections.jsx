import React, { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, Avatar, Box, Skeleton, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AppsIcon from '@mui/icons-material/Apps';
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
    <Grid item xs={12} key={app.id || app.appId}>
      <Card
        sx={{
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => handleAppClick(app.id || app.appId)}
      >
        <CardContent sx={{ py: 1.5 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                minWidth: '24px',
                textAlign: 'right'
              }}
            >
              #{position + 1}
            </Typography>
            <Avatar
              src={app.icon || ''}
              alt={app.title || 'App'}
              variant="rounded"
              sx={{ 
                width: 48, 
                height: 48,
                borderRadius: 1,
                bgcolor: 'grey.200'
              }}
              imgProps={{
                referrerPolicy: 'no-referrer',
                crossOrigin: 'anonymous',
                onError: (e) => {
                  const target = e.target;
                  const currentPolicy = target.getAttribute('referrerPolicy');
                  
                  if (currentPolicy === 'no-referrer') {
                    target.setAttribute('referrerPolicy', 'origin');
                    target.src = app.icon;
                  } else if (currentPolicy === 'origin') {
                    // If both attempts fail, show fallback icon
                    const avatarElement = target.parentElement;
                    if (avatarElement) {
                      avatarElement.innerHTML = '';
                      const iconElement = document.createElement('div');
                      iconElement.style.width = '100%';
                      iconElement.style.height = '100%';
                      iconElement.style.display = 'flex';
                      iconElement.style.alignItems = 'center';
                      iconElement.style.justifyContent = 'center';
                      iconElement.innerHTML = '<svg viewBox="0 0 24 24" style="width: 24px; height: 24px;"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" fill="currentColor"></path></svg>';
                      avatarElement.appendChild(iconElement);
                    }
                  }
                }
              }}
            />
            <Box>
              <Typography 
                variant="subtitle1"
                sx={{ 
                  fontWeight: 500,
                  lineHeight: 1.2,
                  mb: 0.5
                }}
              >
                {app.title || 'Untitled App'}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{
                  lineHeight: 1
                }}
              >
                {app.editor || app.developer || 'Unknown Developer'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderSkeleton = () => (
    <Grid item xs={12}>
      <Card>
        <CardContent sx={{ py: 1.5 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Skeleton variant="text" width={24} />
            <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 1 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="40%" />
            </Box>
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
      <Grid item xs={12} md={6} lg={4} sx={{ mb: { xs: 4, sm: 6 } }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              All
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Grid container spacing={1}>
              {loading && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>)}
              {!loading && data && data.slice(0, 10).map((app, index) => renderAppCard(app, index))}
            </Grid>
          </Box>
        </Box>
      </Grid>
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
        <Grid container spacing={3}>
          {collections.map(collection => (
            <CollectionGroup
              key={collection.id}
              collection={collection}
              country={country}
              selectedStore={selectedStore}
              onAppClick={handleAppClick}
            />
          ))}
        </Grid>
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
