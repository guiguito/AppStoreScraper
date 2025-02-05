import React, { useState, useEffect } from 'react';
import { Grid, Typography, Card, CardContent, Avatar, Box, Skeleton, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config';

const collections = [
  { id: 'topfreeapplications', title: 'Top Free Apps' },
  { id: 'topgrossingapplications', title: 'Top Grossing' },
  { id: 'toppaidapplications', title: 'Top Paid Apps' },
  { id: 'newapplications', title: 'New Apps' },
  { id: 'newfreeapplications', title: 'New Free Apps' },
  { id: 'newpaidapplications', title: 'New Paid Apps' }
];

function AppCollections({ country }) {
  const navigate = useNavigate();
  const [collectionData, setCollectionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        const responses = await Promise.all(
          collections.map(({ id }) =>
            fetch(buildApiUrl(`/collection/${id}`, { country }))
              .then(res => res.json())
              .then(data => ({ id, data }))
          )
        );

        const newData = {};
        responses.forEach(({ id, data }) => {
          newData[id] = data;
        });
        setCollectionData(newData);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [country]);

  const renderAppCard = (app) => (
    <Grid item xs={12} sm={6} md={4} lg={2.4} key={app.id}>
      <Card
        sx={{
          cursor: 'pointer',
          height: '100%',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => navigate(`/app/${app.id}?country=${country}`)}
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
              {app.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {app.developer}
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

  return (
    <>
    <Box sx={{ my: { xs: 4, sm: 6 } }}>
      {collections.map(({ id, title }) => (
        <Box key={id} sx={{ mb: { xs: 4, sm: 6 } }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2
          }}>
            <Typography 
              variant="h6"
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' }
              }}
              onClick={() => {
                setSelectedCollection({ id, title });
                setModalOpen(true);
              }}
            >
              View all
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {loading
              ? Array(5).fill(0).map((_, i) => renderSkeleton())
              : collectionData[id]?.slice(0, 5).map(renderAppCard)}
          </Grid>
        </Box>
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
      <DialogContent dividers sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {selectedCollection && collectionData[selectedCollection.id]?.slice(0, 200).map(renderAppCard)}
        </Grid>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default AppCollections;
