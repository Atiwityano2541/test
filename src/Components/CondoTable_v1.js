import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Filter } from 'lucide-react';

const FilterDropdownCard = ({ 
    isOpen, 
    onClose, 
    position, 
    columnKey, 
    data, 
    onFilter,
    currentFilters,
    selectedAmphoe  // Add selectedAmphoe prop
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState(new Set(currentFilters));
    const cardRef = useRef(null);

    // Get unique values for the column, filtered by selected amphoe
    const uniqueValues = useMemo(() => {
        if (!columnKey || !data) return [];
        
        // First filter data by selected amphoe
        const boundaryFilteredData = selectedAmphoe 
            ? data.filter(item => item.properties?.AMP_NAME_T === selectedAmphoe)
            : data;
        
        // Then get unique values from the filtered dataset
        return [...new Set(boundaryFilteredData.map(item => {
            if (!item) return null;
            
            if (columnKey.startsWith('coordinates')) {
                return item.geometry?.coordinates?.[columnKey === 'coordinates[1]' ? 1 : 0];
            }
            return item.properties?.[columnKey];
        }))].filter(Boolean).sort();
    }, [columnKey, data, selectedAmphoe]);

    // Reset selections when amphoe changes
    useEffect(() => {
        setSelectedItems(new Set());
    }, [selectedAmphoe]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cardRef.current && !cardRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Reset selected items when column changes
    useEffect(() => {
        setSelectedItems(new Set(currentFilters));
    }, [columnKey, currentFilters]);

    // Handle select all
    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedItems(new Set(uniqueValues));
        } else {
            setSelectedItems(new Set());
        }
    };

    // Handle individual item selection
    const handleSelectItem = (value) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(value)) {
            newSelected.delete(value);
        } else {
            newSelected.add(value);
        }
        setSelectedItems(newSelected);
    };

    // Handle apply filters
    const handleApply = () => {
        onFilter(Array.from(selectedItems));
        onClose();
    };

    // Filter values based on search
    const filteredValues = uniqueValues.filter(value => 
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div 
            ref={cardRef}
            className="absolute bg-white border rounded-md shadow-lg z-50"
            style={{
                top: position.top,
                left: position.left,
                minWidth: '250px'
            }}
        >
            <div className="p-3 border-b">
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="w-full px-8 py-2 text-sm border rounded focus:outline-none focus:border-blue-500"
                    />
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
                <div className="p-2 border-b hover:bg-gray-50">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedItems.size === uniqueValues.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">(Select All)</span>
                    </label>
                </div>
                
                {filteredValues.map((value, index) => (
                    <div key={index} className="p-2 hover:bg-gray-50">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedItems.has(value)}
                                onChange={() => handleSelectItem(value)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm truncate">{value}</span>
                        </label>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-gray-50 flex justify-end space-x-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
                >
                    Cancel
                </button>
                <button
                    onClick={handleApply}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    OK
                </button>
            </div>
        </div>
    );
};


export const CondoTable = ({ condoData, selectedAmphoe, onRowClick }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [filters, setFilters] = useState({});
    const [activeFilter, setActiveFilter] = useState(null);
    const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
    const itemsPerPage = 5;

    // Reset pagination when amphoe changes
    useEffect(() => {
        setCurrentPage(0);
        // Clear existing filters when new amphoe is selected
        if (selectedAmphoe) {
            setFilters({});
            setSortConfig({ key: 'AMP_NAME_T', direction: 'ascending' });
        }
    }, [selectedAmphoe]);

    const filteredAndSortedData = useMemo(() => {
        if (!condoData?.features) return [];

        let filteredItems = [...condoData.features];
    
        // Primary filter: Always filter by selected amphoe first
        if (selectedAmphoe) {
            filteredItems = filteredItems.filter(item =>
                item.properties?.AMP_NAME_T === selectedAmphoe // Changed from includes() to exact match
            );
        }

        // Secondary filters: Apply column filters only to condos within selected amphoe
        Object.entries(filters).forEach(([key, selectedValues]) => {
            if (selectedValues && selectedValues.length > 0) {
                filteredItems = filteredItems.filter(item => {
                    let value;
                    if (key.startsWith('coordinates')) {
                        // Handle coordinate filtering
                        value = item.geometry.coordinates[key === 'coordinates[1]' ? 1 : 0];
                    } else {
                        value = item.properties[key];
                    }
                    return selectedValues.includes(value);
                });
            }
        });

        // Apply sorting to filtered results
        if (sortConfig.key) {
            filteredItems.sort((a, b) => {
                let aValue, bValue;
                
                if (sortConfig.key.startsWith('coordinates')) {
                    const coordIndex = sortConfig.key === 'coordinates[1]' ? 1 : 0;
                    aValue = a.geometry.coordinates[coordIndex];
                    bValue = b.geometry.coordinates[coordIndex];
                } else {
                    aValue = a.properties[sortConfig.key] || '';
                    bValue = b.properties[sortConfig.key] || '';
                }

                // Handle string comparison
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        return filteredItems;
    }, [condoData, sortConfig, selectedAmphoe, filters]);

    // Update tableData to only process the current page of filtered results
    const tableData = useMemo(() => {
        return filteredAndSortedData
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map(feature => ({
                nameThai: feature.properties.name_thai || 'ไม่ระบุชื่อ',
                nameEng: feature.properties.name_english || 'Unnamed',
                amphoe: feature.properties.AMP_NAME_T || 'Unknown',
                address: feature.properties.formatted_address || 'No Address',
                latitude: feature.geometry.coordinates[1].toFixed(6),
                longitude: feature.geometry.coordinates[0].toFixed(6)
            }));
    }, [filteredAndSortedData, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedData.length / itemsPerPage);
    }, [filteredAndSortedData]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortDirection = (name) => {
        if (sortConfig.key === name) {
            return sortConfig.direction === 'ascending' ? '↑' : '↓';
        }
        return '';
    };

    const handleFilterClick = (event, columnKey) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        setFilterPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX
        });
        setActiveFilter(columnKey);
    };

    const handleFilterApply = (selectedValues) => {
        setFilters(prev => ({
            ...prev,
            [activeFilter]: selectedValues
        }));
    };

    const getPropertyKey = (columnName) => {
        const keyMap = {
            'ชื่อ (ไทย)': 'name_thai',
            'Name (English)': 'name_english',
            'เขต/อำเภอ': 'AMP_NAME_T',
            'ที่อยู่': 'formatted_address',
            'Lat': 'coordinates[1]',
            'Long': 'coordinates[0]'
        };
        return keyMap[columnName];
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 max-h-100 overflow-x-auto">
            <div className="mb-2 text-sm text-gray-600">
                {selectedAmphoe ? 
                    `Showing condos in ${selectedAmphoe} (${filteredAndSortedData.length} results)` : 
                    'Showing all condos'}
            </div>
            <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                    <tr>
                        {[
                            'ชื่อ (ไทย)',
                            'Name (English)',
                            'เขต/อำเภอ',
                            'ที่อยู่',
                            'Lat',
                            'Long'
                        ].map((columnName) => (
                            <th 
                                key={columnName}
                                className="w-1/6 px-4 py-2 text-left text-sm font-medium text-gray-700"
                            >
                                <div className="flex items-center space-x-2">
                                    <span 
                                        className="cursor-pointer hover:text-gray-900"
                                        onClick={() => requestSort(getPropertyKey(columnName))}
                                    >
                                        {columnName} {getSortDirection(getPropertyKey(columnName))}
                                    </span>
                                    <button
                                        onClick={(e) => handleFilterClick(e, getPropertyKey(columnName))}
                                        className="p-1 hover:bg-gray-100 rounded"
                                    >
                                        <Filter size={14} className={filters[getPropertyKey(columnName)] ? 'text-blue-500' : 'text-gray-400'} />
                                    </button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {tableData.map((condo, index) => (
                        <tr key={index} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => onRowClick([parseFloat(condo.longitude), parseFloat(condo.latitude)])}>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.nameThai}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.nameEng}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.amphoe}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.address}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{condo.latitude}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{condo.longitude}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <FilterDropdownCard
                isOpen={activeFilter !== null}
                onClose={() => setActiveFilter(null)}
                position={filterPosition}
                columnKey={activeFilter}
                data={condoData?.features || []}
                onFilter={handleFilterApply}
                currentFilters={filters[activeFilter] || []}
            />

            <div className="flex justify-between mt-4">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                    Back
                </button>
                <span className="py-2">Page {currentPage + 1} of {totalPages}</span>
                <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                    Next
                </button>
            </div>
        </div>
    );
};