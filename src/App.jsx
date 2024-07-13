import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Image as ImageIcon, Scissors, Plus, Clipboard, Upload, XCircle, Trash2, ArrowLeft, ArrowRight, Delete, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Draggable from 'react-draggable';

/**
 * @typedef {Object} StitchedImage
 * @property {'stitched'} type
 * @property {string} url
 * @property {string[]} originalImages
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {string | StitchedImage} ImageType
 */

// Define the type of draggable item
const ItemType = {
  IMAGE: 'image',
};

// Define StitchedImageEditor component at the top of the file
const StitchedImageEditor = ({ stitchedImages, canvasSize, onDrag }) => {
  console.log("Rendering StitchedImageEditor");
  console.log("stitchedImages:", stitchedImages);
  console.log("canvasSize:", canvasSize);

  if (!stitchedImages || stitchedImages.length === 0) {
    return <div>No stitched images to display</div>;
  }

  if (!canvasSize || canvasSize.width === 0 || canvasSize.height === 0) {
    return <div>Invalid canvas size</div>;
  }

  return (
    <div className="overflow-auto" style={{ maxWidth: '100%', maxHeight: '80vh' }}>
      <div 
        className="relative border border-gray-300"
        style={{ width: canvasSize.width, height: canvasSize.height, background: '#f0f0f0' }}
      >
        {stitchedImages.map((image, index) => (
          <Draggable
            key={index}
            defaultPosition={{ x: image.x, y: image.y }}
            bounds="parent"
            onDrag={(e, data) => onDrag(index, e, data)}
          >
            <img
              src={image.src}
              alt={`Stitched Image ${index + 1}`}
              style={{
                width: image.width,
                height: image.height,
                position: 'absolute',
                cursor: 'move',
              }}
            />
          </Draggable>
        ))}
      </div>
    </div>
  );
};

// Add PropTypes for the StitchedImageEditor component
StitchedImageEditor.propTypes = {
  stitchedImages: PropTypes.arrayOf(
    PropTypes.shape({
      src: PropTypes.string.isRequired,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ).isRequired,
  canvasSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  onDrag: PropTypes.func.isRequired,
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

const ImageReplacerStitcher = () => {
  console.log("Rendering ImageReplacerStitcher");
  
  // State to hold the list of images, initialized with one empty image box
  const [images, setImages] = useState(/** @type {ImageType[]} */(['']));
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

  const fileInputRef = useRef(null);

  // Add a new state to track if the "Add Image" button is focused
  const [isAddImageFocused, setIsAddImageFocused] = useState(false);

  // State to manage context menu visibility and position
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  const [stitchedImages, setStitchedImages] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const logEvent = (eventType, details, method = 'mouse') => {
    const eventLog = {
      eventType,
      timestamp: new Date().toISOString(),
      details, // No need to ensure details are serializable
      method,
    };
    console.log(eventLog);
  };

  // Function to add a new image
  const handleAddImage = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Add Image' }, method);
    setImages(prevImages => [...prevImages, '']);
    setIsAddImageFocused(false);
  };

  // Function to stitch images together into a single image
  const handleStitch = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Stitch', method });

    // Calculate the total width and height
    const totalWidth = images.reduce((sum, image) => sum + (image.width || 300), 0);
    const maxHeight = Math.max(...images.map(image => image.height || 225));

    // Double the canvas size
    setCanvasSize({ width: totalWidth * 2, height: maxHeight * 2 });

    // Prepare stitched images data
    let xOffset = 0;
    const stitchedImagesData = images.map((image, index) => {
      const imageData = {
        src: image.src,
        width: image.width || 300,
        height: image.height || 225,
        x: xOffset,
        y: 0, // Start at the top
      };
      xOffset += imageData.width;
      return imageData;
    });

    setStitchedImages(stitchedImagesData);
    setIsStitched(true);
    logEvent('ImagesStitched', { message: 'Images stitched', images, method });
  };

  // Function to unstitch images
  const handleUnstitch = (method = 'mouse') => {
    logEvent('ButtonPressed', { buttonText: 'Unstitch', method });
    setStitchedImages([]);
    setIsStitched(false);
    logEvent('ImagesUnstitched', { originalImages: images, method });
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
        break;
      }
    }
  }, [selectedIndex, images]);

  // Function to handle file input change
  const handleFileChange = async (e, method = 'mouse') => {
    logEvent('FileChange', { index: selectedIndex }, method);
    if (selectedIndex === null) return;

    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = await loadImage(e.target.result);
          const aspectRatio = img.width / img.height;
          let width, height;
          if (aspectRatio > 4/3) {
            width = 300;
            height = 300 / aspectRatio;
          } else {
            height = 225;
            width = 225 * aspectRatio;
          }
          logEvent('ImageUploaded', { source: 'upload', size: file.size, width: img.width, height: img.height, index: selectedIndex, isInplace: images[selectedIndex] !== '' }, method);
          setImages(prevImages => {
            const newImages = [...prevImages];
            newImages[selectedIndex] = {
              src: e.target.result,
              originalWidth: img.width,
              originalHeight: img.height,
              width,
              height
            };
            return newImages;
          });
        } catch (error) {
          console.error('Error loading image:', error);
        }
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

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleDownload = () => {
    if (images[0] && images[0].type === 'stitched') {
      const link = document.createElement('a');
      link.href = images[0].url;
      link.download = 'stitched_image.png';
      link.click();
      logEvent('DownloadImage', { message: 'Image downloaded' });
      setContextMenu({ visible: false, x: 0, y: 0 });
    }
  };

  const handleCopyToClipboard = () => {
    if (images[0] && images[0].type === 'stitched') {
      fetch(images[0].url)
        .then(response => response.blob())
        .then(blob => {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            logEvent('CopyToClipboard', { message: 'Image copied to clipboard' });
            setContextMenu({ visible: false, x: 0, y: 0 });
          }).catch(err => {
            console.error('Failed to copy: ', err);
          });
        });
    }
  };

  const handleClickOutside = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  useEffect(() => {
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // Method to calculate the dimensions of the grid
  const calculateGridDimensions = () => {
    const totalWidth = images.reduce((sum, image) => sum + (image.width || 300), 0);
    const maxHeight = Math.max(...images.map(image => image.height || 225));
    return `${Math.round(totalWidth)}x${Math.round(maxHeight)}`;
  };

  // Function to handle image loading and dimension detection
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Add a function to handle image dragging
  const handleDrag = (index, e, data) => {
    const newStitchedImages = [...stitchedImages];
    newStitchedImages[index] = {
      ...newStitchedImages[index],
      x: data.x,
      y: data.y,
    };
    setStitchedImages(newStitchedImages);
  };

  console.log("isStitched:", isStitched);
  console.log("stitchedImages:", stitchedImages);
  console.log("canvasSize:", canvasSize);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow p-4 max-w-2xl mx-auto" onPaste={handlePaste}>
          {console.log("Rendering main content")}
          <div className="flex justify-between mb-4">
            <AddImageButton 
              onClick={handleAddImage} 
              isDisabled={isStitched} 
              isFocused={isAddImageFocused && images.length === 0}
              tabIndex={0}
            />
          </div>
          {isStitched ? (
            <StitchedImageEditor
              stitchedImages={stitchedImages}
              canvasSize={canvasSize}
              onDrag={handleDrag}
            />
          ) : (
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
              onContextMenu={handleContextMenu}
              handleDownload={handleDownload}
              handleCopyToClipboard={handleCopyToClipboard}
            />
          )}
          <StitchButton 
            isStitched={isStitched} 
            onClick={isStitched ? handleUnstitch : handleStitch} 
            isDisabled={!isStitched && images.length < 2}
            tabIndex={2}
          />
          <div className="mt-4">
            <h2 className="text-lg font-bold mb-2">Post-Stitch Image Dimensions</h2>
            <div className="text-sm text-gray-600">
              <p>{calculateGridDimensions()}</p>
            </div>
          </div>
          <KeyboardUsageGuide />
          <div className="mt-4">
            <h2 className="text-lg font-bold mb-2">Image Grid Data</h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${images.length}, 50px)`, gridAutoRows: '50px' }}>
              {images.map((image, index) => (
                <div 
                  key={index} 
                  className={`relative border border-black flex items-center justify-center text-xs p-1 ${typeof image === 'string' && image !== '' ? 'bg-blue-200' : ''}`}
                  style={{ fontSize: '10px' }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-center break-words">
                    {image === '' ? 'Empty' : typeof image === 'string' ? '' : 'Blank'}
                    {typeof image === 'string' && image !== '' && (
                      <div>
                        <img src={image} alt={`Image ${index + 1}`} onLoad={(e) => {
                          const img = e.target;
                          img.parentElement.innerHTML = `${img.naturalWidth}x${img.naturalHeight}`;
                        }} style={{ display: 'none' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {contextMenu.visible && (
            <div 
              className="absolute bg-white border rounded shadow-lg"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button onClick={handleCopyToClipboard} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Copy to Clipboard</button>
              <button onClick={handleDownload} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Download</button>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => handleFileChange(e, 'mouse')}
          />
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
        <KeyLogo></KeyLogo> <span>Select previous action in image</span>
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
const ImageGrid = ({ images, isStitched, selectedIndex, selectedAction, onImageClick, onFileChange, onPasteButtonClick, onKeepBlank, onDelete, moveImage, logEvent, tabIndex, onContextMenu, handleDownload, handleCopyToClipboard }) => {
  return (
    <div 
      className="grid gap-4"
      style={{ 
        gridTemplateColumns: `repeat(${images.length}, 300px)`,
        gridAutoRows: '225px'
      }}
      tabIndex={tabIndex}
    >
      {images.map((image, index) => (
        <ImageBox
          key={index}
          image={image}
          index={index}
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
          onContextMenu={onContextMenu}
          handleDownload={handleDownload}
          handleCopyToClipboard={handleCopyToClipboard}
        />
      ))}
    </div>
  );
};

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
      className={`relative border ${selectedIndex === index ? 'ring-2 ring-blue-500' : image === '' ? 'border-dotted border-black' : 'border-black'} ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onImageClick(index)}
      style={{ width: '300px', height: '225px' }} // Updated container size
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {image && image.src ? (
          <img 
            src={image.src} 
            alt={`Image ${index + 1}`} 
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: `${image.width}px`,
              height: `${image.height}px`,
              objectFit: 'contain'
            }}
          />
        ) : (
          <div className="w-full h-full bg-white border border-black"></div>
        )}
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
    {isStitched ? <Scissors className="mr-2" /> : <ImageIcon className="mr-2" />}
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
  onContextMenu: PropTypes.func.isRequired,
  handleDownload: PropTypes.func.isRequired,
  handleCopyToClipboard: PropTypes.func.isRequired,
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