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
      <Box
        sx={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // Scrollbar styling
          '&::-webkit-scrollbar': {
            height: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          // Firefox scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            py: 1, // Add padding to show box-shadow
            width: 'fit-content' // Allow container to grow with items
          }}
        >
          {screenshots.map((screenshot, index) => (
            <Box
              key={screenshot}
              onClick={() => handleOpen(index)}
              sx={{
                cursor: 'pointer',
                height: 500, // Fixed height for all screenshots
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)'
                }
              }}
            >
              <img
                style={{
                  height: '100%',
                  width: 'auto',
                  display: 'block'
                }}
                src={screenshot}
                alt={`Screenshot ${index + 1}`}
                loading="lazy"
              />
            </Box>
          ))}
        </Box>
      </Box>

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
