import React, { createContext, useContext, useState, useCallback } from 'react';
import L from 'leaflet';
import { toast } from 'react-toastify';
import api from '../services/api';

const MapContext = createContext(null);

export const MapProvider = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const loadAnnouncements = useCallback(async (filters = {}) => {
    try {
      const { data } = await api.get('/announcements', { params: filters });
      setAnnouncements(data);
      return data;
    } catch (error) {
      console.error('Erreur de chargement:', error);
      toast.error('Erreur lors du chargement des annonces');
      return [];
    }
  }, []);
  const createAnnouncement = async (announcementData) => {
    try {
      setIsRouting(true);
      const { data } = await api.post('/announcements', announcementData);
      
      setAnnouncements(prev => [data, ...prev]);
      setSelectedAnnouncement(data);
      toast.success('Annonce publiée avec succès !');
      if (mapInstance && data.departureCoords) {
        mapInstance.flyTo(data.departureCoords, 10);
      }
      
      return data;
    } catch (error) {
      console.error('Erreur de création:', error);
      toast.error(error.response?.data?.message || 'Erreur de publication');
      return null;
    } finally {
      setIsRouting(false);
    }
  };
  const calculateRoute = async (start, end, waypoints = []) => {
    try {
      setIsRouting(true);
      const waypointsParam = waypoints.length > 0 
        ? `&steps=true&waypoints=${waypoints.join(';')}` 
        : '';
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson${waypointsParam}`
      );
      
      const data = await response.json();
      
      if (data.code !== 'Ok') {
        throw new Error('Impossible de calculer l\'itinéraire');
      }
      
      const route = {
        coordinates: data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]),
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
        waypoints: data.waypoints || []
      };
      
      setCurrentRoute(route);
      return route;
    } catch (error) {
      console.error('Erreur de calcul:', error);
      toast.error('Erreur lors du calcul de l\'itinéraire');
      return null;
    } finally {
      setIsRouting(false);
    }
  };

  const updateUserPosition = (position) => {
    setUserPosition([position.lat, position.lng]);
    if (mapInstance) {
      mapInstance.flyTo([position.lat, position.lng], 13);
    }
  };

  const value = {
    currentRoute,
    announcements,
    selectedAnnouncement,
    isRouting,
    userPosition,
    mapInstance,
    loadAnnouncements,
    createAnnouncement,
    calculateRoute,
    setSelectedAnnouncement,
    setMapInstance,
    updateUserPosition
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap doit être utilisé dans un MapProvider');
  }
  return context;
};