import React, { useState } from 'react';
import {
  ImageList,
  ImageListItem,
  Dialog,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext,
  NavigateBefore,
} from '@mui/icons-material';

function ScreenshotGallery({ screenshots }) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleOpen = (index) => {
    setCurrentIndex(index);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % screenshots.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <>
      <ImageList sx={{ width: '100%', height: 200 }} cols={4} rowHeight={164}>
        {screenshots.map((screenshot, index) => (
          <ImageListItem 
            key={screenshot} 
            sx={{ cursor: 'pointer' }}
            onClick={() => handleOpen(index)}
          >
            <img
              src={screenshot}
              alt={`Screenshot ${index + 1}`}
              loading="lazy"
              style={{ objectFit: 'cover', height: '100%' }}
            />
          </ImageListItem>
        ))}
      </ImageList>

      <Dialog
        fullScreen={fullScreen}
        maxWidth="xl"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            bgcolor: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>

          <IconButton
            sx={{
              position: 'absolute',
              left: 8,
              color: 'white',
            }}
            onClick={handlePrev}
          >
            <NavigateBefore />
          </IconButton>

          <img
            src={screenshots[currentIndex]}
            alt={`Screenshot ${currentIndex + 1}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <IconButton
            sx={{
              position: 'absolute',
              right: 8,
              color: 'white',
            }}
            onClick={handleNext}
          >
            <NavigateNext />
          </IconButton>
        </Box>
      </Dialog>
    </>
  );
}

export default ScreenshotGallery;
