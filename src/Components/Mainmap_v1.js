import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { CondoTable } from './CondoTable_v1';
import { useFetchBTS, useAddBTS } from './useBTSMap'; // Import hooks
import { useFetchBTSLines, useAddBTSLines } from './useBTSLinesMap';
mapboxgl.accessToken = 'pk.eyJ1IjoiYXRpd2l0IiwiYSI6ImNraHEzd2dhcjFoM3IzOG14OWE2NDN4d2EifQ.gpmCZaDqR21iu8k2jbv4PQ';

const BangkokMapboundary = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [condoCount, setCondoCount] = useState(0);
    const [amphoeFeatures, setAmphoeFeatures] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [condoData, setCondoData] = useState(null);
    const [selectedAmphoe, setSelectedAmphoe] = useState('');
    const [showTable, setShowTable] = useState(true); // New state for table visibility
    const [btsStations, setBTSStations] = useState([]); // State for BTS stations

    const btsIconUrl = 'https://upload.wikimedia.org/wikipedia/commons/e/ee/BTS-Logo.svg'; // Replace with your actual BTS icon URL

    // Use the custom hook to fetch BTS stations
    useFetchBTS(setBTSStations);

    // Add BTS markers to the map when stations are fetched
    useAddBTS(map, btsStations, btsIconUrl);

    // Add BTS lines to the map
    const [btsLines, setBTSLines] = useState([]);
    useFetchBTSLines(setBTSLines);
    useAddBTSLines(map, btsLines);

    // Handle keydown events for arrow keys and Enter
    const handleKeyDown = (e) => {
        if (suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                if (activeIndex >= 0) {
                    const selectedFeature = suggestions[activeIndex];
                    setSearchInput(selectedFeature.properties.AMP_NAME_T);
                    setSuggestions([]);
                    highlightAmphoe(selectedFeature.properties.AMP_NAME_T);
                    setActiveIndex(-1);
                }
                break;
            case 'Escape':
                setSuggestions([]);
                setActiveIndex(-1);
                break;
        }
    };

    // Zoom to the selected condo
    const zoomToCondo = (coordinates) => {
        map.current.flyTo({
            center: coordinates,
            zoom: 18
        });
    };

    // Fetch condo data on component mount
    useEffect(() => {
        const loadCondoData = async () => {
            try {
                const response = await fetch('Condos.geojson');
                const data = await response.json();
                setCondoData(data);
            } catch (error) {
                console.error('Error loading condo data:', error);
            }
        };
        loadCondoData();
    }, []);
    
    // Initialize the map
    useEffect(() => {
        if (!map.current && mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/light-v11',
                center: [100.547224, 13.737520],
                zoom: 10
            });

            map.current.on('load', () => {
                initializeLayers();

                map.current.on('click', 'bkk-points', (e) => {
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    zoomToCondo(coordinates);
                });
            });

            map.current.on('style.load', () => {
                const layers = map.current.getStyle().layers;
                const labelLayerId = layers.find(
                    (layer) => layer.type === 'symbol' && layer.layout['text-field']
                ).id;

                map.current.addLayer(
                    {
                        id: 'add-3d-buildings',
                        source: 'composite',
                        'source-layer': 'building',
                        filter: ['==', 'extrude', 'true'],
                        type: 'fill-extrusion',
                        minzoom: 15,
                        paint: {
                            'fill-extrusion-color': '#aaa',
                            'fill-extrusion-height': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15,
                                0,
                                15.05,
                                ['get', 'height']
                            ],
                            'fill-extrusion-base': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15,
                                0,
                                15.05,
                                ['get', 'min_height']
                            ],
                            'fill-extrusion-opacity': 0.6
                        }
                    },
                    labelLayerId
                );
            });
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Initialize map layers
    const initializeLayers = async () => {
        try {
            const [amphoeData, condoData] = await Promise.all([
                fetch('Amphoe-4326.geojson').then(res => res.json()),
                fetch('Condos-lastest.geojson').then(res => res.json())
            ]);

            setAmphoeFeatures(amphoeData.features);

            const mapInstance = map.current;

            mapInstance.addSource('Amphoe-bkk', {
                type: 'geojson',
                data: amphoeData
            });

            mapInstance.addSource('bkk', {
                type: 'geojson',
                data: condoData
            });

            mapInstance.addLayer({
                id: 'Amphoe-borders',
                type: 'line',
                source: 'Amphoe-bkk',
                paint: {
                    'line-color': '#cccccc',
                    'line-width': 1,
                    'line-opacity': 0.5
                }
            });

            mapInstance.addLayer({
                id: 'Amphoe-highlighted',
                type: 'fill',
                source: 'Amphoe-bkk',
                paint: {
                    'fill-color': '#FF5722',
                    'fill-opacity': 0.2
                },
                filter: ['==', ['get', 'AMP_NAME_T'], '']
            });

            mapInstance.addLayer({
                id: 'Amphoe-highlighted-border',
                type: 'line',
                source: 'Amphoe-bkk',
                paint: {
                    'line-color': '#FF5722',
                    'line-width': 3,
                    'line-opacity': 0.8
                },
                filter: ['==', ['get', 'AMP_NAME_T'], '']
            });

            mapInstance.addLayer({
                id: 'bkk-points',
                type: 'circle',
                source: 'bkk',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#FF5722',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#000'
                }
            });

            mapInstance.on('mouseenter', 'bkk-points', () => {
                mapInstance.getCanvas().style.cursor = 'pointer';
            });

            mapInstance.on('mouseleave', 'bkk-points', () => {
                mapInstance.getCanvas().style.cursor = '';
            });
        } catch (err) {
            console.error('Failed to initialize map layers:', err);
        }
    };

    // Handle search input
    const handleSearch = (searchText) => {
        if (!searchText || searchText.length < 2) {
            setSuggestions([]);
            setCondoCount(0);
            setSelectedAmphoe('');
            
            // Reset map filters
            const mapInstance = map.current;
            mapInstance.setFilter('Amphoe-highlighted', ['==', ['get', 'AMP_NAME_T'], '']);
            mapInstance.setFilter('Amphoe-highlighted-border', ['==', ['get', 'AMP_NAME_T'], '']);
            mapInstance.setFilter('bkk-points', null);
            
            // Reset map view to initial position
            mapInstance.flyTo({
                center: [100.547224, 13.737520],
                zoom: 10,
                essential: true
            });
            
            return;
        }
    
        const searchLower = searchText.toLowerCase();
        const matches = amphoeFeatures
            .filter(feature =>
                feature.properties.AMP_NAME_T.toLowerCase().includes(searchLower)
            )
            .slice(0, 5);
    
        setSuggestions(matches);
    };

    // Highlight the selected amphoe
    const highlightAmphoe = (amphoeName) => {
        const mapInstance = map.current;
        setSelectedAmphoe(amphoeName);

        mapInstance.setFilter('Amphoe-highlighted', ['==', ['get', 'AMP_NAME_T'], '']);
        mapInstance.setFilter('Amphoe-highlighted-border', ['==', ['get', 'AMP_NAME_T'], '']);
        mapInstance.setFilter('bkk-points', null);

        mapInstance.setFilter('Amphoe-highlighted', ['==', ['get', 'AMP_NAME_T'], amphoeName]);
        mapInstance.setFilter('Amphoe-highlighted-border', ['==', ['get', 'AMP_NAME_T'], amphoeName]);
        mapInstance.setFilter('bkk-points', ['==', ['get', 'AMP_NAME_T'], amphoeName]);

        const feature = mapInstance.querySourceFeatures('Amphoe-bkk', {
            filter: ['==', ['get', 'AMP_NAME_T'], amphoeName]
        })[0];

        if (feature) {
            const bounds = new mapboxgl.LngLatBounds();
            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach(coord => {
                    bounds.extend(coord);
                });
            }

            mapInstance.fitBounds(bounds, {
                padding: 50,
                maxZoom: 16
            });

            const condos = mapInstance.querySourceFeatures('bkk', {
                filter: ['==', ['get', 'AMP_NAME_T'], amphoeName]
            });
            setCondoCount(condos.length);
        }
    };

    // Clear the selected amphoe
    const clearSelection = () => {
        setSearchInput('');
        setSuggestions([]);
        setCondoCount(0);
        setSelectedAmphoe('');
        setActiveIndex(-1);

        const mapInstance = map.current;
        mapInstance.setFilter('Amphoe-highlighted', ['==', ['get', 'AMP_NAME_T'], '']);
        mapInstance.setFilter('Amphoe-highlighted-border', ['==', ['get', 'AMP_NAME_T'], '']);
        mapInstance.setFilter('bkk-points', null);

        mapInstance.flyTo({
            center: [100.547224, 13.737520],
            zoom: 10,
            essential: true
        });
    };

    return (
        <div className="relative w-full h-screen">
            <div className="absolute top-0 left-0 z-10 p-4 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
                        <div className="relative">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setSearchInput(newValue);
                                handleSearch(newValue);
                                setActiveIndex(-1);
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full p-2 border rounded"
                            placeholder="ค้นหาตามขอบเขต แขวง/อำเภอ..."
                        />
                            {searchInput && (
                                <button
                                    onClick={clearSelection}
                                    className="absolute right-2 top-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    X
                                </button>
                            )}
                            {suggestions.length > 0 && (
                                <ul className="absolute w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                                    {suggestions.map((feature, index) => (
                                        <li
                                            key={feature.properties.AMP_NAME_T}
                                            className={`p-2 hover:bg-gray-100 cursor-pointer ${
                                                index === activeIndex ? 'bg-gray-200' : ''
                                            }`}
                                            onClick={() => {
                                                highlightAmphoe(feature.properties.AMP_NAME_T);
                                                setSearchInput(feature.properties.AMP_NAME_T);
                                                setSuggestions([]);
                                                setActiveIndex(-1);
                                            }}
                                        >
                                            {feature.properties.AMP_NAME_T}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <p>จำนวนคอนโดในพื้นที่: {condoCount / 2}</p>
                    </div>
                    <button
                        onClick={() => setShowTable(!showTable)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        {showTable ? 'ซ่อนตาราง' : 'แสดงตาราง'}
                    </button>
                </div>
                {showTable && (
                    <div className="w-full">
                        <CondoTable 
                            condoData={condoData} 
                            selectedAmphoe={selectedAmphoe}
                            onRowClick={zoomToCondo}
                        />
                    </div>
                )}
            </div>
            <div ref={mapContainer} className="absolute inset-0" />
        </div>
    );
};

export default BangkokMapboundary;