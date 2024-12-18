import { useEffect } from 'react';
import axios from 'axios';
import '../App.css';

export const useFetchBTS = (setBTSStations) => {
  useEffect(() => {
    const fetchBTSStations = async () => {
      try {
        const response = await axios.get('/BTS_point_th.geojson'); // Replace with your actual endpoint
        if (response.data && response.data.features) {
          setBTSStations(response.data.features);
        }
      } catch (error) {
        console.error('Error fetching BTS stations:', error);
      }
    };

    fetchBTSStations();
  }, [setBTSStations]);
};

export const useAddBTS = (mapRef, stations) => {
  const btsIconUrl = 'BTS-Logo.png'; // Add your local or hosted BTS logo path here
  const mrtIconUrl =
    'MRT-Logo.png'; // Add your local or hosted MRT logo path here
  const srtIconUrl =
    'SRT-Logo.png'; // Add your local or hosted SRT logo path here

  useEffect(() => {
    if (!mapRef.current || !stations.length) return;

    const map = mapRef.current;

    // Function to add sources and layers
    const addBTSSourceAndLayer = () => {
      if (!map.getSource('transit-stations')) {
        map.addSource('transit-stations', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: stations,
          },
        });

        if (!map.getLayer('transit-stations-layer')) {
          map.addLayer({
            id: 'transit-stations-layer',
            type: 'symbol',
            source: 'transit-stations',
            layout: {
               
              // Dynamically match the icon based on the "Operate" property
              'icon-image': [
                'match',
                ['get', 'Operate'],
                'BTS', 'bts-icon', // BTS operator
                'MRT', 'mrt-icon', // MRT operator
                'การรถไฟแห่งประเทศไทย', 'srt-icon', // State Railway of Thailand
                'ทางด่วนและรถไฟฟ้ากรุงเทพ', 'mrt-icon', // Bangkok Expressway and Metro
                'bts-icon', // Default fallback
              ],
              'icon-size': 0.1, // Adjust size for better visibility
              'icon-allow-overlap': true, // Prevent icons from being hidden by others
              'text-field': ['get', 'StationEN'], // Display station name in English
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12, // Adjust text size
              'text-offset': [0, 1.2], // Position text slightly above the icon
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#000000', // Set text color to black
            },
          });
        }
      }
    };

    // Load all icons before adding the layer
    const loadIcons = async () => {
      const loadIcon = (url, id) => {
        return new Promise((resolve, reject) => {
          if (!map.hasImage(id)) {
            map.loadImage(url, (error, image) => {
              if (error) {
                console.error(`Error loading ${id}:`, error);
                reject(error);
                return;
              }
              if (!map.hasImage(id)) {
                map.addImage(id, image);
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      };

      try {
        // Load all icons in parallel
        await Promise.all([
          loadIcon(btsIconUrl, 'bts-icon'),
          loadIcon(mrtIconUrl, 'mrt-icon'),
          loadIcon(srtIconUrl, 'srt-icon'),
        ]);
        addBTSSourceAndLayer(); // Add the layer after icons are loaded
      } catch (error) {
        console.error('Error loading icons:', error);
      }
    };

    // Ensure icons and layers are added only after the style is loaded
    if (!map.isStyleLoaded()) {
      map.on('style.load', loadIcons);
    } else {
      loadIcons();
    }

    // Cleanup function to remove layers, sources, and images on unmount
    return () => {
      if (map.getLayer('transit-stations-layer')) {
        map.removeLayer('transit-stations-layer');
      }
      if (map.getSource('transit-stations')) {
        map.removeSource('transit-stations');
      }
      ['bts-icon', 'mrt-icon', 'srt-icon'].forEach((iconId) => {
        if (map.hasImage(iconId)) {
          map.removeImage(iconId);
        }
      });
    };
  }, [mapRef, stations]);
};