import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Filter, X, Eye, EyeOff } from 'lucide-react';

const FilterDropdownCard = ({ 
    isOpen, 
    onClose, 
    position, 
    columnKey, 
    data, 
    onFilter,
    currentFilters,
    selectedAmphoe
    
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState(new Set(currentFilters));
    const cardRef = useRef(null);

    const uniqueValues = useMemo(() => {
        if (!columnKey || !data) return [];
        
        const filteredData = selectedAmphoe 
            ? data.filter(item => item.properties?.AMP_NAME_T === selectedAmphoe)
            : data;
        
        return [...new Set(filteredData.map(item => item.properties?.[columnKey]))]
            .filter(Boolean)
            .sort();
    }, [columnKey, data, selectedAmphoe]);

    useEffect(() => {
        setSelectedItems(new Set());
    }, [selectedAmphoe]);

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

    const handleApply = () => {
        onFilter(Array.from(selectedItems));
        onClose();
    };

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
                </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
                {filteredValues.map((value, index) => (
                    <div key={index} className="p-2 hover:bg-gray-50">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedItems.has(value)}
                                onChange={() => {
                                    const newSelected = new Set(selectedItems);
                                    if (newSelected.has(value)) {
                                        newSelected.delete(value);
                                    } else {
                                        newSelected.add(value);
                                    }
                                    setSelectedItems(newSelected);
                                }}
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

export const CondoTable = ({ condoData, selectedAmphoe, onRowClick, onFilterChange, onAmphoeSelect }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [filters, setFilters] = useState({});
    const [activeFilter, setActiveFilter] = useState(null);
    const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
    const [selectedName, setSelectedName] = useState(null);
    const [isTableVisible, setIsTableVisible] = useState(true);
    const itemsPerPage = 5;

    useEffect(() => {
        setCurrentPage(0);
        if (selectedAmphoe) {
            setFilters({});
            setSortConfig({ key: 'AMP_NAME_T', direction: 'ascending' });
        }
    }, [selectedAmphoe]);

    const handleClearAll = () => {
        setCurrentPage(0);
        setSortConfig({ key: null, direction: 'ascending' });
        setFilters({});
        setSelectedName(null);
        onFilterChange([]);
    };
    

    const filteredAndSortedData = useMemo(() => {
        if (!condoData?.features) return [];
    
        let filteredItems = [...condoData.features];
    
        if (selectedAmphoe) {
            filteredItems = filteredItems.filter(item =>
                item.properties?.AMP_NAME_T === selectedAmphoe
            );
        }
    
        Object.entries(filters).forEach(([key, selectedValues]) => {
            if (selectedValues && selectedValues.length > 0) {
                filteredItems = filteredItems.filter(item => {
                    let value;
                    if (key.startsWith('coordinates')) {
                        value = item.geometry.coordinates[key === 'coordinates[1]' ? 1 : 0];
                    } else {
                        value = item.properties[key];
                    }
                    return selectedValues.includes(value);
                });
            }
        });
    
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

    const tableData = useMemo(() => {
        return filteredAndSortedData
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map(feature => ({
                nameThai: feature.properties.name_thai || 'ไม่ระบุชื่อ',
                nameEng: feature.properties.name_english || 'Unnamed',
                amphoe: feature.properties.AMP_NAME_T || 'Unknown',
                address: feature.properties.formatted_address || 'No Address',
                nearestStation: feature.properties.nearest_station_1 || 'N/A',
                coordinates: feature.geometry.coordinates
            }));
    }, [filteredAndSortedData, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

    const handleRowClick = (condo) => {
        if (selectedName === condo.nameThai) {
            setSelectedName(null);
        } else {
            setSelectedName(condo.nameThai);
        }
        
        onRowClick({
            ...condo,
            zoom: 10,
            center: condo.coordinates,
        });
    };

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

    const getPropertyKey = (columnName) => {
        const keyMap = {
            'ชื่อ (ไทย)': 'name_thai',
            'Name (English)': 'name_english',
            'เขต/อำเภอ': 'AMP_NAME_T',
            'ที่อยู่': 'formatted_address',
            'สถานีใกล้เคียง': 'nearest_station_1',
        };
        return keyMap[columnName];
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 max-h-100 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
              
                    <button
                        onClick={() => setIsTableVisible(!isTableVisible)}
                        className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        {isTableVisible ? (
                            <>
                                <EyeOff size={14} className="mr-1" />
                                ซ่อนตาราง
                            </>
                        ) : (
                            <>
                                <Eye size={14} className="mr-1" />
                                แสดงตาราง
                            </>
                        )}
                    </button>
                </div>
                <button
                    onClick={handleClearAll}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                    <X size={14} className="mr-1" />
                    Clear All
                </button>
            </div>
            
            {isTableVisible && (
                <>
                    <table className="w-full table-fixed">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    'ชื่อ (ไทย)',
                                    'Name (English)',
                                    'เขต/อำเภอ',
                                    'ที่อยู่',
                                    'สถานีใกล้เคียง',
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
                                <tr 
                                    key={index}
                                    className={`hover:bg-gray-50 cursor-pointer ${
                                        selectedName === condo.nameThai ? 'bg-blue-100' : ''
                                    }`}
                                    onClick={() => handleRowClick(condo)}
                                >
                                    <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.nameThai}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.nameEng}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.amphoe}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 truncate">{condo.address}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900">{condo.nearestStation}</td>
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
                        onFilter={(selectedValues) => {
                            setFilters(prev => ({
                                ...prev,
                                [activeFilter]: selectedValues
                            }));
    
                            const selectedCondos = condoData.features.filter(item =>
                                selectedValues.includes(item.properties[activeFilter])
                            );
                            onFilterChange(selectedCondos.map(item => item.properties.name_thai));
                        }}
                        currentFilters={filters[activeFilter] || []}
                        selectedAmphoe={selectedAmphoe}
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
                </>
            )}
        </div>
    );
};