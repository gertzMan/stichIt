import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Image as ImageIcon, Scissors, Plus, Clipboard, Upload, XCircle, Trash2, ArrowLeft, ArrowRight, Delete, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
const StitchedImageEditor = ({ stitchedImages, onDrag, onResize, selectedIndex, canvasWidth, canvasHeight }) => {
  const [draggingState, setDraggingState] = useState(null);
  const longPressTimeoutRef = useRef(null);
  const longPressDelay = 100; // milliseconds

  // Function to scale images to fit within the canvas
  const scaleImagesToFitCanvas = (images) => {
    let maxWidth = 0;
    let maxHeight = 0;

    images.forEach(image => {
      maxWidth = Math.max(maxWidth, image.width);
      maxHeight = Math.max(maxHeight, image.height);
    });

    const widthScale = canvasWidth / maxWidth;
    const heightScale = canvasHeight / maxHeight;
    const scale = Math.min(widthScale, heightScale, 1); // Ensure scale is not greater than 1

    return images.map(image => ({
      ...image,
      width: image.width * scale,
      height: image.height * scale,
    }));
  };

  const scaledImages = scaleImagesToFitCanvas(stitchedImages);

  const handleMouseDown = useCallback((index, e) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const originalX = stitchedImages[index].x;
    const originalY = stitchedImages[index].y;

    const startTime = Date.now();

    const handleMouseMove = (moveEvent) => {
      const currentTime = Date.now();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (currentTime - startTime >= longPressDelay) {
        setDraggingState({
          index,
          startX,
          startY,
          originalX,
          originalY,
        });
        onDrag(index, null, {
          x: originalX + dx,
          y: originalY + dy,
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDraggingState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    longPressTimeoutRef.current = setTimeout(() => {
      setDraggingState({
        index,
        startX,
        startY,
        originalX,
        originalY,
      });
    }, longPressDelay);

    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [stitchedImages, onDrag]);

  const handleResizeMouseDown = (index, e) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const originalWidth = stitchedImages[index].width;
    const originalHeight = stitchedImages[index].height;
    const originalX = stitchedImages[index].x;
    const originalY = stitchedImages[index].y;
    const aspectRatio = originalWidth / originalHeight;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // Calculate new dimensions while maintaining aspect ratio
      let newWidth = originalWidth + dx;
      let newHeight = newWidth / aspectRatio;

      // Check if we're hitting the right or bottom boundary
      const isHittingRightBoundary = originalX + newWidth > canvasWidth;
      const isHittingBottomBoundary = originalY + newHeight > canvasHeight;

      // Adjust dimensions if hitting boundaries
      if (isHittingRightBoundary) {
        newWidth = canvasWidth - originalX;
        newHeight = newWidth / aspectRatio;
      }
      if (isHittingBottomBoundary) {
        newHeight = canvasHeight - originalY;
        newWidth = newHeight * aspectRatio;
      }

      // Ensure we're not making the image smaller than a minimum size (e.g., 20x20 pixels)
      const minSize = 20;
      newWidth = Math.max(newWidth, minSize);
      newHeight = Math.max(newHeight, minSize);

      // Final boundary check
      newWidth = Math.min(newWidth, canvasWidth - originalX);
      newHeight = Math.min(newHeight, canvasHeight - originalY);

      onResize(index, newWidth, newHeight, originalX, originalY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  if (!stitchedImages || stitchedImages.length === 0) {
    return <div>No stitched images to display</div>;
  }

  return (
    <div className="overflow-auto" style={{ maxWidth: '100%', maxHeight: '80vh' }}>
      <div 
        className="relative border border-gray-300"
        style={{ width: canvasWidth, height: canvasHeight, background: '#f0f0f0' }}
      >
        {scaledImages.map((image, index) => (
          <div
            key={index}
            data-index={index}
            style={{
              position: 'absolute',
              left: image.x,
              top: image.y,
              cursor: draggingState && draggingState.index === index ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={(e) => handleMouseDown(index, e)}
          >
            <img
              src={image.src}
              alt={`Stitched Image ${index + 1}`}
              style={{
                width: image.width,
                height: image.height,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                backgroundColor: 'blue',
                cursor: 'nwse-resize',
              }}
              onMouseDown={(e) => handleResizeMouseDown(index, e)}
            />
          </div>
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
  onDrag: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  selectedIndex: PropTypes.number,
  canvasWidth: PropTypes.number.isRequired,
  canvasHeight: PropTypes.number.isRequired,
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
  // State to hold the list of images, initialized with one empty image box
  const [images, setImages] = useState([
    {
      src: '',
      width: 300,
      height: 225,
      x: 0,
      y: 0,
    },
  ]);
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

  // Function to add a new image
  const handleAddImage = (method = 'mouse') => {
    setImages(prevImages => [
      ...prevImages,
      {
        src: '',
        width: 300,
        height: 225,
        x: 0,
        y: 0,
      },
    ]);
    setIsAddImageFocused(false);
  };

  // Function to stitch images together into a single image
  const handleStitch = (method = 'mouse') => {
    // Calculate the total width and height of all images
    const totalWidth = images.reduce((sum, image) => sum + image.width, 0);
    const totalHeight = Math.max(...images.map(image => image.height));

    // Prepare stitched images data
    let xOffset = 0;
    const stitchedImagesData = images.map((image, index) => {
      const imageData = {
        src: image.src,
        width: image.width,
        height: image.height,
        x: xOffset,
        y: 0, // Start at the top
      };
      xOffset += image.width;
      return imageData;
    });

    setStitchedImages(stitchedImagesData);
    setCanvasSize({ width: totalWidth, height: totalHeight });
    setIsStitched(true);
  };

  // Function to unstitch images
  const handleUnstitch = (method = 'mouse') => {
    setStitchedImages([]);
    setIsStitched(false);
  };

  // Function to handle image box click
  const handleImageClick = (index) => {
    setSelectedIndex(index);
  };

  // Function to handle paste event
  const handlePaste = useCallback((e) => {
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
            setImages(prevImages => {
              const newImages = [...prevImages];
              newImages[selectedIndex] = {
                src: e.target.result,
                originalWidth: img.width,
                originalHeight: img.height,
                width: newImages[selectedIndex].width,
                height: newImages[selectedIndex].height,
                x: newImages[selectedIndex].x,
                y: newImages[selectedIndex].y,
              };
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
    if (selectedIndex === null) return;

    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = await loadImage(e.target.result);
          setImages(prevImages => {
            const newImages = [...prevImages];
            newImages[selectedIndex] = {
              src: e.target.result,
              originalWidth: img.width,
              originalHeight: img.height,
              width: img.width, // Use original width
              height: img.height, // Use original height
              x: newImages[selectedIndex].x,
              y: newImages[selectedIndex].y,
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
    if (selectedIndex === null || selectedIndex >= images.length) return;

    navigator.clipboard.read().then((items) => {
      for (let item of items) {
        if (item.types.includes('image/png')) {
          item.getType('image/png').then((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new window.Image();
              img.onload = () => {
                setImages(prevImages => {
                  const newImages = [...prevImages];
                  newImages[selectedIndex] = {
                    src: e.target.result,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    width: img.width, // Use original width
                    height: img.height, // Use original height
                    x: newImages[selectedIndex].x,
                    y: newImages[selectedIndex].y,
                  };
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
    if (selectedIndex !== null) {
      setImages(prevImages => {
        const newImages = [...prevImages];
        newImages[selectedIndex] = {
          src: '',
          width: newImages[selectedIndex].width,
          height: newImages[selectedIndex].height,
          x: newImages[selectedIndex].x,
          y: newImages[selectedIndex].y,
        };
        return newImages;
      });
    }
  };

  // Function to delete an image box
  const handleDelete = (index, method = 'mouse') => {
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
    setStitchedImages(prevImages => {
      const newImages = [...prevImages];
      const image = newImages[index];
      
      // Constrain x and y within the canvas
      const newX = Math.max(0, Math.min(data.x, canvasSize.width - image.width));
      const newY = Math.max(0, Math.min(data.y, canvasSize.height - image.height));

      newImages[index] = {
        ...image,
        x: newX,
        y: newY,
      };

      return newImages;
    });
  };

  // Add a function to handle image resizing
  const handleResize = (index, newWidth, newHeight, originalX, originalY) => {
    setStitchedImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index] = {
        ...newImages[index],
        width: newWidth,
        height: newHeight,
        x: originalX,
        y: originalY,
      };
      return newImages;
    });
  };

  // Add a condition to disable the "Add Image" button if there's already an empty box in the grid
  const isAddImageDisabled = images.some(image => image.src === '');

  // Define the handleReset function to reset the app state by calling the initialize function
  const handleReset = () => {
    initialize();
  };

  // Function to initialize or reset the app state
  const initialize = () => {
    setImages([
      {
        src: '',
        width: 300,
        height: 225,
        x: 0,
        y: 0,
      },
    ]);
    setIsStitched(false);
    setSelectedIndex(null);
    setOriginalImages([]);
    setStitchedImageUrl(null);
    setSelectedAction(null);
    setStitchedImages([]);
    setIsAddImageFocused(false);
    setContextMenu({ visible: false, x: 0, y: 0 });
    setCanvasSize({ width: 0, height: 0 });
  };

  // Call the initialize function at the start of the component
  useEffect(() => {
    initialize();
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow p-4 mx-auto" style={{ maxWidth: '800px' }} onPaste={handlePaste}>
          <div className="flex justify-between mb-4">
            <AddImageButton 
              onClick={handleAddImage} 
              isDisabled={isStitched || isAddImageDisabled} 
              isFocused={isAddImageFocused && images.length === 0}
              tabIndex={0}
            />
            <div className="absolute top-4 right-4">
              <button onClick={handleReset} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Reset</button>
            </div>
          </div>
          {isStitched ? (
            <StitchedImageEditor
              stitchedImages={stitchedImages}
              onDrag={handleDrag}
              onResize={handleResize}
              selectedIndex={selectedIndex}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
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
          <div className="mt-4">
            <h2 className="text-lg font-bold mb-2">Image Grid Data</h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${images.length}, 50px)`, gridAutoRows: '50px' }}>
              {images.map((image, index) => (
                <div 
                  key={index} 
                  className={`relative border border-black flex items-center justify-center text-xs p-1 ${image.src === '' ? 'bg-blue-200' : ''}`}
                  style={{ fontSize: '10px' }}
                >
                  <div ref={parentRef => {
                    if (parentRef) {
                      const img = new Image();
                      img.src = image.src;
                      img.onload = () => {
                        parentRef.innerHTML = `${img.naturalWidth}x${img.naturalHeight}`;
                      };
                    }
                  }} />
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
const ImageGrid = ({ images, isStitched, selectedIndex, selectedAction, onImageClick, onFileChange, onPasteButtonClick, onKeepBlank, onDelete, moveImage, tabIndex, onContextMenu, handleDownload, handleCopyToClipboard }) => {
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
          onContextMenu={onContextMenu}
          handleDownload={handleDownload}
          handleCopyToClipboard={handleCopyToClipboard}
        />
      ))}
    </div>
  );
};

// Component to display an individual image box
const ImageBox = ({ image, index, isStitched, selectedIndex, selectedAction, onImageClick, onFileChange, onPasteButtonClick, onKeepBlank, onDelete, moveImage }) => {
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
      className={`relative border ${selectedIndex === index ? 'ring-2 ring-blue-500' : image.src === '' ? 'border-dotted border-black' : 'border-black'} ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onImageClick(index)}
      style={{ width: '300px', height: '225px' }} // Updated container size
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {image.src && image.src !== '' ? (
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
  images: PropTypes.arrayOf(PropTypes.shape({
    src: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  })).isRequired,
  isStitched: PropTypes.bool.isRequired,
  selectedIndex: PropTypes.number,
  selectedAction: PropTypes.string,
  onImageClick: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onPasteButtonClick: PropTypes.func.isRequired,
  onKeepBlank: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  moveImage: PropTypes.func.isRequired,
  tabIndex: PropTypes.number.isRequired,
  onContextMenu: PropTypes.func.isRequired,
  handleDownload: PropTypes.func.isRequired,
  handleCopyToClipboard: PropTypes.func.isRequired,
};

// PropTypes for ImageBox component
ImageBox.propTypes = {
  image: PropTypes.shape({
    src: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
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
};

// PropTypes for StitchButton component
StitchButton.propTypes = {
  isStitched: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  tabIndex: PropTypes.number.isRequired,
};

export default ImageReplacerStitcher;