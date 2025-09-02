import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import { 
  MapPin, 
  Building, 
  Newspaper, 
  Navigation, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { supabase, Business } from '../services/supabase';

// Fix untuk default markers di react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons yang lebih besar dan jelas
const createCustomIcon = (color: string, size: 'small' | 'medium' | 'large' = 'medium') => {
  const sizes = {
    small: [20, 32],
    medium: [25, 41],
    large: [35, 57]
  };
  
  const [width, height] = sizes[size];
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [width, height],
    iconAnchor: [width/2, height],
    popupAnchor: [1, -height + 10],
    shadowSize: [width + 10, height]
  });
};

const newsIcon = createCustomIcon('red', 'medium');
const businessIcon = createCustomIcon('blue', 'medium');
const villageIcon = createCustomIcon('green', 'large');

// Component untuk kontrol peta kustom
const MapControls: React.FC<{
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFullscreen: () => void;
  onGetLocation: () => void;
}> = ({ onZoomIn, onZoomOut, onResetView, onFullscreen, onGetLocation }) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <button
          onClick={onZoomIn}
          data-scroll-to-top="false"
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-600"
          title="Perbesar"
        >
          <ZoomIn className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={onZoomOut}
          data-scroll-to-top="false"
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-600"
          title="Perkecil"
        >
          <ZoomOut className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={onResetView}
          data-scroll-to-top="false"
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-600"
          title="Reset Tampilan"
        >
          <RotateCcw className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={onFullscreen}
          data-scroll-to-top="false"
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-600"
          title="Layar Penuh"
        >
          <Maximize className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={onGetLocation}
          data-scroll-to-top="false"
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Lokasi Saya"
        >
          <Navigation className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
};

// Component untuk kontrol layer
const LayerControls: React.FC<{
  showNews: boolean;
  showBusinesses: boolean;
  showVillageCenter: boolean;
  onToggleNews: () => void;
  onToggleBusinesses: () => void;
  onToggleVillageCenter: () => void;
}> = ({ 
  showNews, 
  showBusinesses, 
  showVillageCenter, 
  onToggleNews, 
  onToggleBusinesses, 
  onToggleVillageCenter 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          data-scroll-to-top="false"
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Layer</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Info className="h-4 w-4 text-gray-500" />
          </motion.div>
        </button>
        
        <motion.div
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="border-t border-gray-200 dark:border-gray-600 p-2 space-y-1">
            <button
              onClick={onToggleVillageCenter}
              data-scroll-to-top="false"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                showVillageCenter 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showVillageCenter ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>Pusat Desa</span>
            </button>
            
            <button
              onClick={onToggleNews}
              data-scroll-to-top="false"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                showNews 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showNews ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>Lokasi Berita</span>
            </button>
            
            <button
              onClick={onToggleBusinesses}
              data-scroll-to-top="false"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                showBusinesses 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showBusinesses ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>Usaha Lokal</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Component untuk mengontrol peta dari dalam
const MapController: React.FC<{
  center: [number, number];
  zoom: number;
  onMapReady: (map: L.Map) => void;
}> = ({ center, zoom, onMapReady }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      onMapReady(map);
      map.setView(center, zoom);
    }
  }, [map, center, zoom, onMapReady]);

  return null;
};

interface NewsLocation {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: string;
}

const MapPage: React.FC = () => {
  const [newsLocations, setNewsLocations] = useState<NewsLocation[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [showNews, setShowNews] = useState(true);
  const [showBusinesses, setShowBusinesses] = useState(true);
  const [showVillageCenter, setShowVillageCenter] = useState(true);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Koordinat akurat Desa Cikadu, Pelabuhanratu, Sukabumi, Jawa Barat
  const CIKADU_CENTER: [number, number] = [-6.999260873769918, 106.61350332605542];
  const DEFAULT_ZOOM = 15;

  // Mock data lokasi berita dengan koordinat akurat sekitar Desa Cikadu
  const mockNewsLocations: NewsLocation[] = [
    {
      id: '1',
      title: 'Program Pelatihan Digital KKN',
      description: 'Lokasi pelatihan keterampilan digital untuk UMKM',
      lat: -6.998760873769918,
      lng: 106.61400332605542,
      category: 'pendidikan',
    },
    {
      id: '2',
      title: 'Gotong Royong Infrastruktur',
      description: 'Lokasi pembangunan jalan dan jembatan desa',
      lat: -6.999760873769918,
      lng: 106.61300332605542,
      category: 'infrastruktur',
    },
    {
      id: '3',
      title: 'Festival Budaya Tahunan',
      description: 'Panggung utama festival budaya dan seni tradisional',
      lat: -6.999260873769918,
      lng: 106.61450332605542,
      category: 'budaya',
    },
    {
      id: '4',
      title: 'Program Penghijauan',
      description: 'Area penanaman pohon dan konservasi lingkungan',
      lat: -6.998260873769918,
      lng: 106.61250332605542,
      category: 'lingkungan',
    },
  ];

  const mockBusinesses: Business[] = [
    {
      id: '1',
      name: 'Kebun Organik Lembah Hijau',
      description: 'Pusat produksi pertanian organik berkualitas tinggi',
      contact: '+62 812-3456-7890',
      location: 'Kawasan Utara Desa Cikadu',
      image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      created_at: new Date().toISOString(),
      category: 'pertanian',
    },
    {
      id: '2',
      name: 'Sanggar Kerajinan Warisan',
      description: 'Sentra kerajinan tradisional dan seni budaya',
      contact: '+62 813-4567-8901',
      location: 'Pusat Desa Cikadu',
      image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      created_at: new Date().toISOString(),
      category: 'kerajinan',
    },
    {
      id: '3',
      name: 'Kafe Pemandangan Gunung',
      description: 'Kedai kopi dengan pemandangan alam menakjubkan',
      contact: '+62 814-5678-9012',
      location: 'Jalan Utama Desa Cikadu',
      image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      created_at: new Date().toISOString(),
      category: 'kuliner',
    },
  ];

  // Tambahkan koordinat ke mock businesses
  const mockBusinessesWithCoords = mockBusinesses.map((business, index) => ({
    ...business,
    lat: -6.999260873769918 + (index * 0.002),
    lng: 106.61350332605542 + (index * 0.002),
  }));

  useEffect(() => {
    fetchMapData();
    
    // Simulasi loading peta
    const mapLoadTimer = setTimeout(() => {
      setMapLoading(false);
    }, 1500);

    return () => clearTimeout(mapLoadTimer);
  }, []);

  const fetchMapData = async () => {
    try {
      const [newsResponse, businessResponse] = await Promise.all([
        supabase.from('news_locations').select('*'),
        supabase.from('businesses').select('*')
      ]);

      if (newsResponse.error || businessResponse.error) {
        console.log('Menggunakan data lokal karena Supabase belum dikonfigurasi');
        setNewsLocations(mockNewsLocations);
        setBusinesses(mockBusinessesWithCoords);
      } else {
        setNewsLocations(newsResponse.data || mockNewsLocations);
        setBusinesses(businessResponse.data || mockBusinessesWithCoords);
      }
    } catch (error) {
      console.log('Menggunakan data lokal:', error);
      setNewsLocations(mockNewsLocations);
      setBusinesses(mockBusinessesWithCoords);
    } finally {
      setLoading(false);
    }
  };

  const handleMapReady = (map: L.Map) => {
    setMapInstance(map);
    
    // Pastikan peta ter-render dengan benar
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  };

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.setView(CIKADU_CENTER, DEFAULT_ZOOM);
    }
  };

  const handleFullscreen = () => {
    if (mapContainerRef.current) {
      if (!isFullscreen) {
        mapContainerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh browser ini.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 16);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Tidak dapat mengakses lokasi Anda. Pastikan izin lokasi telah diberikan.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      pendidikan: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      infrastruktur: 'bg-orange-100 text-orange-800 border-orange-300',
      budaya: 'bg-purple-100 text-purple-800 border-purple-300',
      lingkungan: 'bg-green-100 text-green-800 border-green-300',
      pertanian: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      kerajinan: 'bg-pink-100 text-pink-800 border-pink-300',
      kuliner: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Memuat data peta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gray-50 dark:bg-gray-900">
      {/* Header Section - Lebih Kompak */}
      <section className="py-8 md:py-12 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center px-4 py-2 mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="font-semibold text-sm">Peta Interaktif</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Peta Desa Cikadu
            </h1>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Jelajahi lokasi program KKN, usaha lokal, dan titik-titik penting di Desa Cikadu, 
              Pelabuhanratu, Sukabumi, Jawa Barat melalui peta interaktif yang mudah digunakan.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{newsLocations.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Lokasi Berita</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{businesses.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">UMKM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">1</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Pusat Desa</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">15</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">km²</div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Container - Perbaikan Utama */}
      <section className="relative">
        <div 
          ref={mapContainerRef}
          className={`relative ${isFullscreen ? 'h-screen' : 'h-[500px] md:h-[600px] lg:h-[700px]'} w-full overflow-hidden bg-gray-200 dark:bg-gray-700`}
        >
          {/* Loading Overlay */}
          {mapLoading && (
            <div className="absolute inset-0 bg-white dark:bg-gray-800 flex items-center justify-center z-[2000]">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">
                  Memuat peta Desa Cikadu...
                </p>
              </div>
            </div>
          )}

          {/* Map Component */}
          <MapContainer
            center={CIKADU_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={true}
            zoomControl={false} // Disable default zoom control
            className="h-full w-full z-0"
            style={{ height: '100%', width: '100%' }}
            whenCreated={(map) => {
              handleMapReady(map);
              setMapLoading(false);
            }}
          >
            <MapController 
              center={CIKADU_CENTER} 
              zoom={DEFAULT_ZOOM} 
              onMapReady={handleMapReady}
            />
            
            {/* Multiple Tile Layer Options untuk reliability */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              minZoom={10}
              errorTileUrl="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OTk5OSI+VGlsZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+"
            />
            
            {/* Village Center Marker */}
            {showVillageCenter && (
              <Marker position={CIKADU_CENTER} icon={villageIcon}>
                <Popup 
                  className="custom-popup" 
                  maxWidth={320}
                  minWidth={280}
                  closeButton={true}
                  autoClose={false}
                  closeOnEscapeKey={true}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-green-800">
                          🏘️ Pusat Desa Cikadu
                        </h3>
                        <p className="text-sm text-gray-600">Jantung kehidupan masyarakat</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-green-700 font-medium mb-1">📍 Alamat Lengkap:</p>
                        <p className="text-green-600">
                          Desa Cikadu, Kecamatan Pelabuhanratu<br/>
                          Kabupaten Sukabumi, Jawa Barat 43364
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => window.open('/about', '_blank')}
                          data-scroll-to-top="false"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Info Desa
                        </button>
                        <button
                          onClick={() => window.open('/news', '_blank')}
                          data-scroll-to-top="false"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Berita
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* News Location Markers */}
            {showNews && newsLocations.map((news) => (
              <Marker
                key={`news-${news.id}`}
                position={[news.lat, news.lng]}
                icon={newsIcon}
              >
                <Popup 
                  className="custom-popup" 
                  maxWidth={300}
                  minWidth={250}
                  closeButton={true}
                  autoClose={false}
                >
                  <div className="p-3">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Newspaper className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base text-red-800 leading-tight">
                          {news.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{news.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(news.category)}`}>
                        {news.category.toUpperCase()}
                      </span>
                      <button
                        onClick={() => window.open(`/news/${news.id}`, '_blank')}
                        data-scroll-to-top="false"
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Baca Selengkapnya →
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Business Markers */}
            {showBusinesses && businesses.map((business) => (
              <Marker
                key={`business-${business.id}`}
                position={[(business as any).lat || CIKADU_CENTER[0], (business as any).lng || CIKADU_CENTER[1]]}
                icon={businessIcon}
              >
                <Popup 
                  className="custom-popup" 
                  maxWidth={320}
                  minWidth={280}
                  closeButton={true}
                  autoClose={false}
                >
                  <div className="p-3">
                    {business.image_url && (
                      <img
                        src={business.image_url}
                        alt={business.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base text-blue-800 leading-tight">
                          {business.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{business.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                        <span>{business.location}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => {
                            const message = `Halo, saya ingin mengetahui informasi lebih lanjut tentang ${business.name}. Terima kasih.`;
                            const whatsappUrl = `https://wa.me/${business.contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          data-scroll-to-top="false"
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => window.open(`/business#${business.id}`, '_blank')}
                          data-scroll-to-top="false"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Detail →
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* User Location Marker */}
            {userLocation && (
              <Marker position={userLocation}>
                <Popup>
                  <div className="p-2 text-center">
                    <h3 className="font-bold text-blue-800">📍 Lokasi Anda</h3>
                    <p className="text-sm text-gray-600">Posisi saat ini</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Custom Map Controls */}
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onFullscreen={handleFullscreen}
            onGetLocation={handleGetCurrentLocation}
          />

          {/* Layer Controls */}
          <LayerControls
            showNews={showNews}
            showBusinesses={showBusinesses}
            showVillageCenter={showVillageCenter}
            onToggleNews={() => setShowNews(!showNews)}
            onToggleBusinesses={() => setShowBusinesses(!showBusinesses)}
            onToggleVillageCenter={() => setShowVillageCenter(!showVillageCenter)}
          />
        </div>
      </section>

      {/* Legend Section - Diperbaiki */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Panduan Penggunaan Peta
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Setiap marker memiliki informasi detail yang dapat diakses dengan mudah
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Pusat Desa</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Marker hijau besar menunjukkan lokasi pusat pemerintahan dan kegiatan utama Desa Cikadu.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Newspaper className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Lokasi Berita</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Marker merah menandai lokasi peristiwa, kegiatan KKN, dan berita terkini yang terjadi di desa.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">UMKM Lokal</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Marker biru menampilkan lokasi usaha mikro, kecil, dan menengah yang beroperasi di desa.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Kontrol Interaktif</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Gunakan kontrol layer dan zoom untuk pengalaman navigasi yang optimal dan mudah.
              </p>
            <div>
          </div>

          {/* Tips Penggunaan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <Card className="p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border border-emerald-200 dark:border-emerald-700">
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  💡 Tips Penggunaan Peta
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Maksimalkan pengalaman Anda dalam menjelajahi Desa Cikadu
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Klik Marker</h4>
                    <p className="text-gray-600 dark:text-gray-300">Klik pada marker untuk melihat informasi detail dan aksi langsung</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Kontrol Layer</h4>
                    <p className="text-gray-600 dark:text-gray-300">Gunakan kontrol layer di kiri atas untuk menyembunyikan/menampilkan kategori</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Navigasi</h4>
                    <p className="text-gray-600 dark:text-gray-300">Gunakan scroll mouse atau kontrol zoom untuk memperbesar/memperkecil tampilan</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-emerald-600 to-blue-600 dark:from-emerald-800 dark:to-blue-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Jelajahi Lebih Dalam Desa Cikadu
            </h2>
            <p className="text-lg md:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Peta ini memberikan gambaran lengkap tentang potensi dan kegiatan di Desa Cikadu. 
              Mari bergabung dalam membangun masa depan yang lebih baik.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold shadow-lg hover:shadow-xl w-full sm:w-auto"
                onClick={() => window.location.href = '/about'}
                disableScrollToTop={false}
              >
                Pelajari Tentang Desa
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 font-bold w-full sm:w-auto"
                onClick={() => window.location.href = '/business'}
                disableScrollToTop={false}
              >
                Lihat UMKM Lokal
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Custom CSS untuk perbaikan tampilan */}
      <style jsx global>{`
        /* Perbaikan Popup Responsif */
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .custom-popup .leaflet-popup-content {
          margin: 0;
          font-family: 'Inter', sans-serif;
          line-height: 1.5;
        }
        
        .custom-popup .leaflet-popup-tip {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        /* Perbaikan Container Peta */
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          background: #f3f4f6;
          font-family: 'Inter', sans-serif;
        }
        
        /* Perbaikan Kontrol Zoom Default */
        .leaflet-control-zoom {
          display: none !important; /* Kita gunakan custom controls */
        }
        
        /* Perbaikan Attribution */
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(10px);
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Responsive Adjustments */
        @media (max-width: 640px) {
          .leaflet-popup-content-wrapper {
            max-width: 280px !important;
            min-width: 250px !important;
          }
          
          .leaflet-control-attribution {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          
          /* Perbaikan untuk touch devices */
          .leaflet-container {
            touch-action: pan-x pan-y;
          }
        }
        
        @media (max-width: 480px) {
          .leaflet-popup-content-wrapper {
            max-width: 260px !important;
            min-width: 230px !important;
          }
        }
        
        /* Perbaikan Loading State */
        .leaflet-tile-loading {
          opacity: 0.5;
          filter: grayscale(100%);
        }
        
        /* Perbaikan Marker Clustering untuk performa */
        .leaflet-marker-icon {
          transition: transform 0.2s ease;
        }
        
        .leaflet-marker-icon:hover {
          transform: scale(1.1);
          z-index: 1000;
        }
        
        /* Dark mode support untuk peta */
        .dark .leaflet-control-attribution {
          background: rgba(31, 41, 55, 0.9) !important;
          color: #e5e7eb !important;
        }
        
        .dark .leaflet-control-attribution a {
          color: #10b981 !important;
        }
        
        /* Perbaikan Fullscreen */
        .leaflet-container:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
        }
        
        .leaflet-container:-moz-full-screen {
          width: 100vw !important;
          height: 100vh !important;
        }
        
        .leaflet-container:fullscreen {
          width: 100vw !important;
          height: 100vh !important;
        }
        
        /* Perbaikan Performance */
        .leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        /* Accessibility Improvements */
        .leaflet-marker-icon:focus {
          outline: 2px solid #059669;
          outline-offset: 2px;
        }
        
        .leaflet-popup-close-button:focus {
          outline: 2px solid #059669;
          outline-offset: 2px;
        }
        
        /* Line clamp utility untuk deskripsi */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default MapPage;