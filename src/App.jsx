import './index.css'; // Import Tailwind CSS

import React, { useState, useCallback } from 'react';
import { Plus, ArrowRight, ArrowDown, Trash2, X, Image, Download } from 'lucide-react';

const BoxGridManagerWithPaste = () => {
  const [grid, setGrid] = useState([[null]]); // Start with one empty box in one row
  const [isStitched, setIsStitched] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null); // {row, col}

  const handleAddBox = () => {
    setGrid(prevGrid => prevGrid.map(row => [...row, null]));
  };

  const handleAddRow = () => {
    setGrid(prevGrid => [...prevGrid, Array(prevGrid[0].length).fill(null)]);
  };

  const handleDeleteBox = () => {
    if (grid[0].length > 1) {
      setGrid(prevGrid => prevGrid.map(row => row.slice(0, -1)));
      setSelectedBox(null);
    }
  };

  const handleDeleteRow = () => {
    if (grid.length > 1) {
      setGrid(prevGrid => prevGrid.slice(0, -1));
      setSelectedBox(null);
    }
  };

  const handleBoxClick = (rowIndex, colIndex) => {
    setSelectedBox({ row: rowIndex, col: colIndex });
  };

  const handleAddImage = (rowIndex, colIndex) => {
    const newImage = `/api/placeholder/${Math.floor(Math.random() * 200 + 100)}/${Math.floor(Math.random() * 200 + 100)}`;
    setGrid(prevGrid => prevGrid.map((row, rIndex) =>
      rIndex === rowIndex
        ? row.map((col, cIndex) => cIndex === colIndex ? newImage : col)
        : row
    ));
  };

  const handleStitch = () => {
    setIsStitched(!isStitched);
  };

  const handleExport = () => {
    console.log("Exporting stitched image...");
    alert("In a real application, this would generate and download a PNG of the stitched image.");
  };

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    if (!selectedBox) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (e) => {
          setGrid(prevGrid => prevGrid.map((row, rIndex) =>
            rIndex === selectedBox.row
              ? row.map((col, cIndex) => cIndex === selectedBox.col ? e.target.result : col)
              : row
          ));
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, [selectedBox]);


  return (
    <div className="p-4 max-w-4xl mx-auto" onPaste={handlePaste}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Box Grid Manager</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleAddBox}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
          >
            <ArrowRight className="mr-2" /> Add Box
          </button>
          <button
            onClick={handleDeleteBox}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
            disabled={grid[0].length <= 1}
          >
            <X className="mr-2" /> Delete Box
          </button>
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          >
            <ArrowDown className="mr-2" /> Add Row
          </button>
          <button
            onClick={handleDeleteRow}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center"
            disabled={grid.length <= 1}
          >
            <Trash2 className="mr-2" /> Delete Row
          </button>
          <button
            onClick={handleStitch}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center"
          >
            <Image className="mr-2" /> {isStitched ? "Unstitch" : "Stitch"}
          </button>
          {isStitched && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center"
            >
              <Download className="mr-2" /> Export PNG
            </button>
          )}
        </div>
      </div>
      <div className={`space-y-4 ${isStitched ? 'flex flex-wrap gap-4' : ''}`}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className={`flex flex-wrap gap-4 ${isStitched ? 'w-full' : ''}`}>
            {row.map((box, colIndex) => (
              <div
                key={colIndex}
                className={`w-40 h-40 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer
                  ${isStitched ? 'w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6' : ''}
                  ${selectedBox && selectedBox.row === rowIndex && selectedBox.col === colIndex ? 'ring-2 ring-blue-500' : ''}
                `}
                onClick={() => handleBoxClick(rowIndex, colIndex)}
              >
                {box ? (
                  <img
                    src={box}
                    alt={`Image ${rowIndex}-${colIndex}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddImage(rowIndex, colIndex);
                    }}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  >
                    <Plus size={24} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {selectedBox && (
        <p className="mt-4 text-sm text-gray-600">
          Box selected: Row {selectedBox.row + 1}, Column {selectedBox.col + 1}. You can paste an image here.
        </p>
      )}
    </div>
  );
};

export default BoxGridManagerWithPaste;