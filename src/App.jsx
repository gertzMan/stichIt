import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Image, Scissors, Plus, Clipboard, Upload, XCircle, Trash2, ArrowLeft, ArrowRight, Delete, ArrowUp, ArrowDown } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Define the type of draggable item
const ItemType = {
  IMAGE: 'image',
};

const ImageReplacerStitcher = () => {
  // State to hold the list of images, initialized with one empty image box
  const [images, setImages] = useState(['']);
  // State to track if images are stitched together
  const [isStitched, setIsStitched] = useState(false);
  // State to track the currently selected image index
  const [selectedIndex, setSelectedIndex] = useState(null);
  // State to store the original images
  const [originalImages, setOriginalImages] = useState([]);
  // State to store the stitched image URL
  const [stitchedImageUrl, setStitchedImageUrl] = useState(null);
  // State to track the selected action within an image
  const [selectedAction, setSelectedAction] = useState(null);
  const actions = ['paste', 'load', 'blank', 'delete'];

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Add a new state to track if the "Add Image" button is focused
  const [isAddImageFocused, setIsAddImageFocused] = useState(false);

  const logEvent = (eventType, details, method = 'mouse') => {
    const isSerializable = (value) => {
      if (typeof value === 'object' && value !== null) {
        try {
          JSON.stringify(value);
          return true;
        } catch (e) {
          return false;
        }
      }
      return true;
    };

    const serializableDetails = Object.keys(details).reduce((acc, key) => {
      if (isSerializable(details[key])) {
        acc[key] = details[key];
      }
      return acc;
    }, {});

    const eventLog = {
      eventType,
      timestamp: new Date().toISOString(),
      details: serializableDetails, // Ensure details are serializable
      method,
    };
    console.log(JSON.stringify(eventLog));
  };

  // Function to add a new image box
  const handleAddImage = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Add Image' }, method);
    const newImage = '';
    setImages(prevImages => [...prevImages, newImage]);
    setIsAddImageFocused(false);
    return images.length; // Return the index of the new image
  };

  // Function to stitch images together into a single image
  const handleStitch = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Stitch' }, method);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const totalWidth = images.length * 100; // Assuming each image is 100px wide
    const height = 100; // Assuming each image is 100px tall

    canvas.width = totalWidth;
    canvas.height = height;

    // Create a white image dynamically using canvas
    const whiteCanvas = document.createElement('canvas');
    whiteCanvas.width = 100;
    whiteCanvas.height = 100;
    const whiteCtx = whiteCanvas.getContext('2d');
    whiteCtx.fillStyle = 'white';
    whiteCtx.fillRect(0, 0, 100, 100);
    const whiteImageSrc = whiteCanvas.toDataURL();

    const imagePromises = images.map((image, index) => {
      return new Promise((resolve) => {
        const img = new window.Image(); // Use window.Image to ensure global Image constructor
        img.src = image || whiteImageSrc;
        img.onload = () => {
          ctx.drawImage(img, index * 100, 0, 100, 100);
          // Draw a black thin border around each image
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          ctx.strokeRect(index * 100, 0, 100, 100);
          resolve();
        };
        img.onerror = (err) => {
          console.error('Image load error:', err);
          // Draw the white image placeholder in case of an error
          const fallbackImg = new window.Image();
          fallbackImg.src = whiteImageSrc;
          fallbackImg.onload = () => {
            ctx.drawImage(fallbackImg, index * 100, 0, 100, 100);
            // Draw a black thin border around each image
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(index * 100, 0, 100, 100);
            resolve();
          };
          fallbackImg.onerror = (fallbackErr) => {
            console.error('Fallback image load error:', fallbackErr);
            resolve();
          };
        };
      });
    });

    Promise.all(imagePromises).then(() => {
      logEvent('ImagesStitched', { message: 'Images stitched on canvas', images }, method);
      const stitchedImageBox = {
        type: 'stitched',
        images: [...images],
      };
      setOriginalImages(images);
      setImages([stitchedImageBox]);
      setIsStitched(true);
    }).catch((err) => {
      console.error('Error stitching images:', err);
    });
  };

  // Function to unstitch images
  const handleUnstitch = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Unstitch' }, method);
    setImages(originalImages);
    setIsStitched(false);
    logEvent('ImagesUnstitched', { originalImages }, method);
  };

  // Function to handle image box click
  const handleImageClick = (index) => {
    logEvent('ImageClick', { index }, 'mouse');
    setSelectedIndex(index);
  };

  // Function to handle paste event
  const handlePaste = useCallback((e) => {
    logEvent('Paste', {}, 'mouse');
    e.preventDefault();
    if (selectedIndex === null) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            logEvent('ImageUploaded', { source: 'clipboard', size: blob.size, width: img.width, height: img.height, index: selectedIndex, isInplace: images[selectedIndex] !== '' }, 'mouse');
            setImages(prevImages => {
              const newImages = [...prevImages];
              newImages[selectedIndex] = e.target.result;
              return newImages;
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, [selectedIndex, images]);

  // Function to handle file input change
  const handleFileChange = (e, method = 'mouse') => {
    logEvent('FileChange', { index: selectedIndex }, method);
    if (selectedIndex === null) return;

    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          logEvent('ImageUploaded', { source: 'upload', size: file.size, width: img.width, height: img.height, index: selectedIndex, isInplace: images[selectedIndex] !== '' }, method);
          setImages(prevImages => {
            const newImages = [...prevImages];
            newImages[selectedIndex] = e.target.result;
            return newImages;
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to handle paste button click
  const handlePasteButtonClick = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Paste' }, method);
    navigator.clipboard.read().then((items) => {
      for (let item of items) {
        if (item.types.includes('image/png')) {
          item.getType('image/png').then((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new window.Image();
              img.onload = () => {
                logEvent('ImageUploaded', { source: 'clipboard', size: blob.size, width: img.width, height: img.height, index: selectedIndex, isInplace: images[selectedIndex] !== '' }, method);
                setImages(prevImages => {
                  const newImages = [...prevImages];
                  newImages[selectedIndex] = e.target.result;
                  return newImages;
                });
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(blob);
          });
        }
      }
    });
  };

  // Function to keep the selected image box blank
  const handleKeepBlank = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Blank' }, method);
    if (selectedIndex !== null) {
      logEvent('ImageUploaded', { source: 'blank', size: 0, width: 0, height: 0, index: selectedIndex, isInplace: images[selectedIndex] !== '' }, method);
      setImages(prevImages => {
        const newImages = [...prevImages];
        newImages[selectedIndex] = '';
        return newImages;
      });
    }
  };

  // Function to delete an image box
  const handleDelete = (index, method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Delete' }, method);
    logEvent('ImageUploaded', { source: 'delete', size: 0, width: 0, height: 0, index, isInplace: false }, method);
    setImages(prevImages => {
      const newImages = prevImages.filter((_, i) => i !== index);
      if (newImages.length === 0) {
        setIsAddImageFocused(true);
      }
      return newImages;
    });
  };

  // Function to move an image box
  const moveImage = (dragIndex, hoverIndex) => {
    logEvent('MoveImage', { dragIndex, hoverIndex }, 'mouse');
    const dragImage = images[dragIndex];
    const newImages = [...images];
    newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, dragImage);
    setImages(newImages);
  };

  // Effect to reset selected index when images change
  useEffect(() => {
    if (selectedIndex !== null) {
      setSelectedIndex(null);
    }
  }, [images]);

  // Updated handleKeyDown function
  const handleKeyDown = useCallback((e) => {
    if (images.length === 0) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAddImage('keyboard');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        setSelectedIndex((prevIndex) => {
          let newIndex;
          if (e.key === 'ArrowLeft') {
            newIndex = prevIndex === null ? images.length - 1 : (prevIndex > 0 ? prevIndex - 1 : prevIndex);
          } else { // ArrowRight
            newIndex = prevIndex === null ? 0 : (prevIndex < images.length - 1 ? prevIndex + 1 : prevIndex);
          }
          return newIndex;
        });
        setSelectedAction(null);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        if (selectedIndex !== null) {
          setSelectedAction((prevAction) => {
            const currentIndex = prevAction === null ? -1 : actions.indexOf(prevAction);
            const newIndex = e.key === 'ArrowUp' 
              ? (currentIndex - 1 + actions.length) % actions.length
              : (currentIndex + 1) % actions.length;
            return actions[newIndex];
          });
        }
        break;
      case 'Enter':
      case ' ': // Space key
        e.preventDefault();
        if (selectedIndex !== null) {
          if (selectedAction !== null) {
            switch (selectedAction) {
              case 'paste':
                handlePasteButtonClick('keyboard');
                break;
              case 'load':
                fileInputRef.current.click();
                logEvent('ButtonPressed', { buttonText: 'Upload' }, 'keyboard');
                break;
              case 'blank':
                handleKeepBlank('keyboard');
                break;
              case 'delete':
                handleDelete(selectedIndex, 'keyboard');
                break;
            }
            setSelectedAction(null);
          } else if (selectedIndex === images.length - 1 && !isStitched) {
            handleAddImage('keyboard');
          }
        }
        break;
      case 'Delete':
        if (selectedIndex !== null) {
          handleDelete(selectedIndex, 'keyboard');
        }
        break;
      case 'v':
        if (e.ctrlKey || e.metaKey) {
          if (selectedIndex !== null) {
            handlePasteButtonClick('keyboard');
          } else if (images.length > 0) {
            setSelectedIndex(0);
            handlePasteButtonClick('keyboard');
          }
        }
        break;
      case 'u':
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          if (selectedIndex !== null) {
            fileInputRef.current.click();
            logEvent('ButtonPressed', { buttonText: 'Upload' }, 'keyboard');
          } else if (images.length > 0) {
            setSelectedIndex(0);
            fileInputRef.current.click();
            logEvent('ButtonPressed', { buttonText: 'Upload' }, 'keyboard');
          }
        }
        break;
      case 'i':
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          if (isStitched) {
            handleUnstitch('keyboard');
          } else if (images.length >= 2) {
            handleStitch('keyboard');
          }
        }
        break;
      case 'a':
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          if (!isStitched) {
            handleAddImage('keyboard');
          }
        }
        break;
      default:
        break;
    }
  }, [selectedIndex, selectedAction, images, handleDelete, handlePasteButtonClick, handleKeepBlank, isStitched, handleStitch, handleUnstitch, handleAddImage]);

  // Add event listener for keydown events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow p-4 max-w-2xl mx-auto" onPaste={handlePaste}>
          <AddImageButton 
            onClick={handleAddImage} 
            isDisabled={isStitched} 
            isFocused={isAddImageFocused && images.length === 0}
            tabIndex={0}
          />
          <ImageGrid 
            images={images} 
            isStitched={isStitched} 
            selectedIndex={selectedIndex} 
            selectedAction={selectedAction}
            onImageClick={handleImageClick} 
            onFileChange={handleFileChange}
            onPasteButtonClick={handlePasteButtonClick}
            onKeepBlank={handleKeepBlank}
            onDelete={handleDelete}
            moveImage={moveImage}
            logEvent={logEvent}
            tabIndex={1}
          />
          <StitchButton 
            isStitched={isStitched} 
            onClick={isStitched ? handleUnstitch : handleStitch} 
            isDisabled={!isStitched && images.length < 2}
            tabIndex={2}
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => handleFileChange(e, 'mouse')}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          <KeyboardUsageGuide />
        </div>
      </div>
    </DndProvider>
  );
};

// Component to display keyboard usage guide
const KeyLogo = ({ children }) => (
  <span className="inline-block bg-gray-200 rounded px-2 py-1 text-xs font-semibold mr-2">{children}</span>
);

const KeyboardUsageGuide = () => (
  <div className="mt-4 text-sm text-gray-600">
    <h2 className="text-lg font-bold mb-4">Keyboard Shortcuts</h2>
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <div className="flex items-center">
        <KeyLogo>←</KeyLogo> <span>Select previous image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>→</KeyLogo> <span>Select next image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>↑</KeyLogo> <span>Select previous action in image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>↓</KeyLogo> <span>Select next action in image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>Enter</KeyLogo>/<KeyLogo>Space</KeyLogo>
        <span>Perform selected action</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>Delete</KeyLogo> <span>Delete selected image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>Ctrl</KeyLogo>+<KeyLogo>V</KeyLogo>
        <span>Paste image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>Ctrl</KeyLogo>+<KeyLogo>Shift</KeyLogo>+<KeyLogo>U</KeyLogo>
        <span>Upload image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>Ctrl</KeyLogo>+<KeyLogo>Shift</KeyLogo>+<KeyLogo>A</KeyLogo>
        <span>Add new image</span>
      </div>
      <div className="flex items-center">
        <KeyLogo>Ctrl</KeyLogo>+<KeyLogo>Shift</KeyLogo>+<KeyLogo>I</KeyLogo>
        <span>Stitch/Unstitch</span>
      </div>
    </div>
  </div>
);

// Component for the "Add Image" button
const AddImageButton = ({ onClick, isDisabled, isFocused, tabIndex }) => (
  <button 
    onClick={isDisabled ? null : onClick}
    className={`mb-4 px-4 py-2 rounded flex items-center ${
      isDisabled ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 
      isFocused ? 'bg-blue-600 text-white ring-2 ring-blue-300' :
      'bg-blue-500 text-white hover:bg-blue-600'
    }`}
    disabled={isDisabled}
    tabIndex={tabIndex}
  >
    <Plus className="mr-2" /> Add Image
  </button>
);

// Component to display the grid of image boxes
const ImageGrid = ({ images, isStitched, selectedIndex, selectedAction, onImageClick, onFileChange, onPasteButtonClick, onKeepBlank, onDelete, moveImage, logEvent, tabIndex }) => (
  <div className={`mt-4 ${isStitched ? 'flex overflow-x-auto' : 'grid grid-cols-3 gap-4'}`} tabIndex={tabIndex}>
    {images.length === 0 ? (
      <ImageBox 
        index={0}
        image=""
        isStitched={isStitched}
        selectedIndex={selectedIndex}
        selectedAction={selectedAction}
        onImageClick={onImageClick}
        onFileChange={onFileChange}
        onPasteButtonClick={onPasteButtonClick}
        onKeepBlank={onKeepBlank}
        onDelete={onDelete}
        moveImage={moveImage}
        logEvent={logEvent}
      />
    ) : (
      images.map((image, index) => (
        <ImageBox 
          key={index} 
          index={index}
          image={image}
          isStitched={isStitched}
          selectedIndex={selectedIndex}
          selectedAction={selectedAction}
          onImageClick={onImageClick}
          onFileChange={onFileChange}
          onPasteButtonClick={onPasteButtonClick}
          onKeepBlank={onKeepBlank}
          onDelete={onDelete}
          moveImage={moveImage}
          logEvent={logEvent}
        />
      ))
    )}
  </div>
);

// Component to display an individual image box
const ImageBox = ({ image, index, isStitched, selectedIndex, selectedAction, onImageClick, onFileChange, onPasteButtonClick, onKeepBlank, onDelete, moveImage, logEvent }) => {
  const ref = React.useRef(null);

  // Setup drop target for drag-and-drop
  const [, drop] = useDrop({
    accept: ItemType.IMAGE,
    hover(item) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }
      moveImage(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  // Setup drag source for drag-and-drop
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.IMAGE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div 
      ref={ref}
      className={`relative border ${selectedIndex === index ? 'ring-2 ring-blue-500' : 'border-black'} ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onImageClick(index)}
    >
      <img 
        src={image || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='} 
        alt={`Image ${index + 1}`} 
        className={isStitched ? "h-40 flex-shrink-0" : "w-full h-40 object-cover rounded-lg"}
      />
      {selectedIndex === index && !isStitched && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center space-y-2">
          <button 
            className={`px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center ${selectedAction === 'paste' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onPasteButtonClick();
            }}
          >
            <Clipboard className="mr-1" /> Paste
          </button>
          <label className={`px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center cursor-pointer ${selectedAction === 'load' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Upload className="mr-1" /> Load
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => {
                e.stopPropagation();
                onFileChange(e);
              }} 
            />
          </label>
          <button 
            className={`px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center ${selectedAction === 'blank' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onKeepBlank();
            }}
          >
            <XCircle className="mr-1" /> Blank
          </button>
          <button 
            className={`px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center ${selectedAction === 'delete' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
          >
            <Trash2 className="mr-1" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Component for the "Stitch/Unstitch Images" button
const StitchButton = ({ isStitched, onClick, isDisabled, tabIndex }) => (
  <button 
    onClick={isDisabled ? null : onClick}
    className={`mt-4 px-4 py-2 rounded flex items-center ${isDisabled ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : isStitched ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
    disabled={isDisabled}
    tabIndex={tabIndex}
  >
    {isStitched ? <Scissors className="mr-2" /> : <Image className="mr-2" />}
    {isStitched ? "Unstitch Images" : "Stitch Images"}
  </button>
);

// PropTypes for AddImageButton component
AddImageButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isFocused: PropTypes.bool.isRequired,
  tabIndex: PropTypes.number.isRequired,
};

// PropTypes for ImageGrid component
ImageGrid.propTypes = {
  images: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])).isRequired,
  isStitched: PropTypes.bool.isRequired,
  selectedIndex: PropTypes.number,
  selectedAction: PropTypes.string,
  onImageClick: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onPasteButtonClick: PropTypes.func.isRequired,
  onKeepBlank: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  moveImage: PropTypes.func.isRequired,
  logEvent: PropTypes.func.isRequired,
  tabIndex: PropTypes.number.isRequired,
};

// PropTypes for ImageBox component
ImageBox.propTypes = {
  image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  index: PropTypes.number.isRequired,
  isStitched: PropTypes.bool.isRequired,
  selectedIndex: PropTypes.number,
  selectedAction: PropTypes.string,
  onImageClick: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onPasteButtonClick: PropTypes.func.isRequired,
  onKeepBlank: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  moveImage: PropTypes.func.isRequired,
  logEvent: PropTypes.func.isRequired,
};

// PropTypes for StitchButton component
StitchButton.propTypes = {
  isStitched: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  tabIndex: PropTypes.number.isRequired,
};

export default ImageReplacerStitcher;