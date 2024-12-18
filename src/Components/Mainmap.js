import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { CondoTable } from './CondoTable';
import { useFetchBTS, useAddBTS } from './useBTSMap';
import { useFetchBTSLines, useAddBTSLines } from './useBTSLinesMap';
import * as turf from '@turf/turf';
mapboxgl.accessToken = 'pk.eyJ1IjoiYXRpd2l0IiwiYSI6ImNraHEzd2dhcjFoM3IzOG14OWE2NDN4d2EifQ.gpmCZaDqR21iu8k2jbv4PQ';

const BangkokMap = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [condoData, setCondoData] = useState(null);
    const [filteredCondos, setFilteredCondos] = useState(null);
    const [btsStations, setBTSStations] = useState([]);
    const [btsLines, setBTSLines] = useState([]);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [amphoeData, setAmphoeData] = useState(null);
    const [selectedAmphoe, setSelectedAmphoe] = useState(null);
    // Fetch BTS stations and lines data
    useFetchBTS(setBTSStations);
    useFetchBTSLines(setBTSLines);

    // Add BTS stations and lines to map
    useAddBTS(map, btsStations);
    useAddBTSLines(map, btsLines);


    // Load condo data
    useEffect(() => {
        const loadCondoData = async () => {
            try {
                const response = await fetch('Condos.geojson');
                const data = await response.json();
                console.log('Loaded condo data:', data);
                // alert('Loaded condo data:', JSON.stringify.data);
                setCondoData(data);
                setFilteredCondos(data);
            } catch (error) {
                console.error('Error loading condo data:', error);
            }
        };

        loadCondoData();
    }, []);

    // Fetch data
    useFetchBTS(setBTSStations);
    useFetchBTSLines(setBTSLines);

    // Load Amphoe boundaries
    useEffect(() => {
        const loadAmphoeData = async () => {
            try {
                const response = await fetch('Amphoe-4326.geojson');
                const data = await response.json();
                setAmphoeData(data);
            } catch (error) {
                console.error('Error loading Amphoe data:', error);
            }
        };

        loadAmphoeData();
    }, []);

    // Add or update Amphoe boundary layer
    useEffect(() => {
        if (!map.current || !mapLoaded || !amphoeData) return;

        // Remove existing Amphoe layer if it exists
        if (map.current.getLayer('amphoe-boundaries')) {
            map.current.removeLayer('amphoe-boundaries');
        }
        if (map.current.getSource('amphoe')) {
            map.current.removeSource('amphoe');
        }

        // If an Amphoe is selected, add the layer and zoom to its boundaries
        if (selectedAmphoe) {
            // Find the selected Amphoe feature
            const selectedAmphoeFeature = amphoeData.features.find(
                feature => feature.properties.AMP_NAME_T === selectedAmphoe
            );

            if (selectedAmphoeFeature) {
                // Add Amphoe source
                map.current.addSource('amphoe', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [selectedAmphoeFeature]
                    }
                });

                // Add Amphoe boundary layer
                map.current.addLayer({
                    id: 'amphoe-boundaries',
                    type: 'fill',
                    source: 'amphoe',
                    paint: {
                        'fill-color': '#FF5722',
                        'fill-opacity': 0.2
                    },
                });

                // Zoom to the selected Amphoe
                const bounds = turf.bbox(selectedAmphoeFeature);
                map.current.fitBounds(bounds, { 
                    padding: 50,
                    duration: 1000
                });
            }
        }
    }, [mapLoaded, selectedAmphoe, amphoeData]);

    // Initialize map
    useEffect(() => {
        if (!map.current && mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/light-v11',
                center: [100.547224, 13.737520],
                zoom: 10,
            });

            map.current.on('load', () => {
                console.log('Map loaded');
                setMapLoaded(true);
            });

            // Add click handler for condo points
            map.current.on('click', 'condo-points', (e) => {
                const coordinates = e.features[0].geometry.coordinates.slice();
                
                // Ensure proper zoom to point
                map.current.flyTo({
                    center: coordinates,
                    zoom: 15,
                    duration: 1000
                });
            });

            // Change cursor to pointer when hovering over condo points
            map.current.on('mouseenter', 'condo-points', () => {
                map.current.getCanvas().style.cursor = 'pointer';
            });

            // Change cursor back when leaving condo points
            map.current.on('mouseleave', 'condo-points', () => {
                map.current.getCanvas().style.cursor = '';
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

    // Add or update condo layer when map is loaded and data is available
    useEffect(() => {
        if (!map.current || !mapLoaded || !filteredCondos) return;

        console.log('Adding/updating condo layer');

        // Add source if it doesn't exist
        if (!map.current.getSource('condos')) {
            map.current.addSource('condos', {
                type: 'geojson',
                data: filteredCondos,
            });

            // Add layer if it doesn't exist
            map.current.addLayer({
                id: 'condo-points',
                type: 'circle',
                source: 'condos',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#FF5722',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#000',
                },
            });
        } else {
            // Update existing source
            map.current.getSource('condos').setData(filteredCondos);
        }
    }, [mapLoaded, filteredCondos]);

    // Handle row click
    const handleRowClick = (condo) => {
        if (map.current) {
            map.current.flyTo({
                center: condo.center,
                zoom: 15,
                duration: 1000
            });
        }
    };

    // Handle filter change
    const handleFilterChange = (selectedNames) => {
        if (!condoData) return;

        if (selectedNames.length === 0) {
            setFilteredCondos(condoData);
            return;
        }

        const filteredFeatures = condoData.features.filter((feature) =>
            selectedNames.includes(feature.properties.name_thai)
        );

        const newFilteredData = {
            type: 'FeatureCollection',
            features: filteredFeatures,
        };

        setFilteredCondos(newFilteredData);
    };
  
    return (
        <div className="relative w-full h-screen">
            <div className="absolute top-0 left-0 z-10 p-4 flex flex-col gap-4">
                <div className="w-full">
                    <CondoTable 
                        condoData={condoData} 
                        onFilterChange={handleFilterChange}
                        onRowClick={(condo) => {
                            // If the condo has an Amphoe, set it
                            if (condo.amphoe) {
                                setSelectedAmphoe(condo.amphoe);
                            }
                            
                            // Existing row click logic
                            if (map.current) {
                                map.current.flyTo({
                                    center: condo.center,
                                    zoom: 16,
                                    duration: 1000
                                });
                            }
                        }}

                        
                    />
                </div>
            </div>
            <div ref={mapContainer} className="absolute inset-0" />
        </div>
    );
};

export default BangkokMap;