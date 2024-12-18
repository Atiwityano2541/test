import { useEffect } from 'react';
import axios from 'axios';

export const useFetchBTSLines = (setBTSLines) => {
  useEffect(() => {
    const fetchBTSLines = async () => {
      try {
        const response = await axios.get('/BTS_lines.geojson');
        if (response.data && response.data.features) {
          setBTSLines(response.data.features);
        }
      } catch (error) {
        console.error('Error fetching BTS lines:', error);
      }
    };

    fetchBTSLines();
  }, [setBTSLines]);
};

export const useAddBTSLines = (mapRef, btsLines) => {
  useEffect(() => {
    if (!mapRef.current || !btsLines.length) return;

    const map = mapRef.current;

    const initializeLayer = () => {
      const geojsonData = {
        type: 'FeatureCollection',
        features: btsLines.map((line, index) => ({
          ...line,
          id: index
        }))
      };

      // Add the source if it doesn't exist
      if (!map.getSource('bts-lines')) {
        map.addSource('bts-lines', {
          type: 'geojson',
          data: geojsonData
        });

        // Add line layer
        map.addLayer({
          id: 'bts-lines-layer',
          type: 'line',
          source: 'bts-lines',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'Color'],
              'สีเขียวเข้ม', '#006400',
              'สีเขียวแถบเหลือง', '#9ACD32',
              'สีเขียวอ่อน', '#90EE90',
              'สีชมพู', '#FF69B4',
              'สีแดง', '#FF0000',
              'สีแดงเข้ม', '#8B0000',
              'สีแดงอ่อน', '#FF6666',
              'สีทอง', '#FFD700',
              'สีเทา', '#808080',
              'สีน้ำเงิน', '#0000FF',
              'สีน้ำตาล', '#8B4513',
              'สีฟ้า', '#87CEEB',
              'สีม่วง', '#800080',
              'สีส้ม', '#FFA500',
              'สีเหลือง', '#FFFF00',
              'รถไฟความเร็วสูง สายกรุงเทพ-ระยอง', '#000000',
              '#9ACD32'
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 4,
              15, 8
            ],
            'line-opacity': 0.8,
            'line-dasharray': [
              'case',
              ['>', ['get', 'Active'], 1], [2, 2],
              ['literal', []]
            ]
          }
        }, 'transit-stations-layer'); // Add the line layer BEFORE the stations layer

        // Ensure the stations layer is always on top
        if (map.getLayer('transit-stations-layer')) {
          map.moveLayer('transit-stations-layer');
        }
      } else {
        // Update the source data if it already exists
        map.getSource('bts-lines').setData(geojsonData);
        
        // Make sure stations layer stays on top after data update
        if (map.getLayer('transit-stations-layer')) {
          map.moveLayer('transit-stations-layer');
        }
      }
    };

    if (map.loaded()) {
      initializeLayer();
    } else {
      map.on('load', () => {
        initializeLayer();
        // Additional check to ensure stations layer stays on top after map load
        if (map.getLayer('transit-stations-layer')) {
          map.moveLayer('transit-stations-layer');
        }
      });
    }

    // Cleanup function
    return () => {
      if (map.getLayer('bts-lines-layer')) {
        map.removeLayer('bts-lines-layer');
      }
      if (map.getSource('bts-lines')) {
        map.removeSource('bts-lines');
      }
    };
  }, [mapRef, btsLines]);
};