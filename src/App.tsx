import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Info, Compass, Calendar, Plus, X, Save, Lock, Unlock, Trash2, Edit, Instagram, Globe, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Configurações da Aplicação - Altere aqui os nomes e textos
const APP_CONFIG = {
  title: "Campus Explorer", // Deixe vazio "" se quiser preencher depois
  subtitle: "Atividades extracurriculares no campus.",
  campusCoords: [-22.8925916, -43.324568] as [number, number],
  defaultZoom: 16, // Zoom intermediário para melhor visibilidade em dispositivos móveis
};

interface Atividade {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  local: string;
  latitude: number;
  longitude: number;
  tipo: 'local' | 'atividade';
  instagram?: string;
  website?: string;
  localPaiId?: string;
}

// Custom Icons
const localIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const atividadeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapEvents({ onMapClick, isEditMode }: { onMapClick: (lat: number, lng: number) => void, isEditMode: boolean }) {
  useMapEvents({
    click(e) {
      if (isEditMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function App() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAtividade, setSelectedAtividade] = useState<Atividade | null>(null);
  
  // New states for mapping
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPin, setNewPin] = useState<{ lat: number, lng: number } | null>(null);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newPinType, setNewPinType] = useState<'local' | 'atividade'>('atividade');
  const [selectedLocalId, setSelectedLocalId] = useState<string>('');
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Atividade | null>(null);

  useEffect(() => {
    fetchAtividades();
  }, []);

  const fetchAtividades = async () => {
    try {
      const response = await fetch('/api/atividades');
      if (!response.ok) throw new Error('Falha ao carregar atividades');
      const data = await response.json();
      
      // Ensure every item has an ID for robust editing/deletion
      const sanitizedData = data.map((item: any) => ({
        ...item,
        id: item.id || `legacy-${item.nome.replace(/\s+/g, '-').toLowerCase()}`
      }));
      
      setAtividades(sanitizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewPin({ lat, lng });
    setSelectedAtividade(null);
  };

  const handleSaveNewActivity = async () => {
    if (!newActivityName || (!newPin && !editingAtividade)) return;
    
    setIsSaving(true);
    
    let finalLat = editingAtividade ? editingAtividade.latitude : newPin!.lat;
    let finalLng = editingAtividade ? editingAtividade.longitude : newPin!.lng;
    let finalLocalName = "Campus";

    // If an activity is linked to a local, use local's coords but DON'T replace the local
    if (newPinType === 'atividade' && selectedLocalId) {
      const parentLocal = atividades.find(a => a.id === selectedLocalId);
      if (parentLocal) {
        finalLat = parentLocal.latitude;
        finalLng = parentLocal.longitude;
        finalLocalName = parentLocal.nome;
      }
    }

    const activityData: Atividade = {
      id: editingAtividade?.id || Date.now().toString(),
      nome: newActivityName,
      descricao: newActivityDesc || (newPinType === 'local' ? "Local identificado no campus" : "Atividade extracurricular"),
      categoria: newPinType === 'local' ? "Ponto de Interesse" : "Evento",
      local: finalLocalName,
      latitude: finalLat,
      longitude: finalLng,
      tipo: newPinType,
      instagram: newInstagram,
      website: newWebsite,
      localPaiId: newPinType === 'atividade' ? selectedLocalId : undefined
    };

    try {
      const response = await fetch('/api/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });

      if (!response.ok) throw new Error('Erro ao salvar no servidor');
      
      const result = await response.json();
      const savedActivity = result.activity || activityData;

      if (editingAtividade) {
        setAtividades(prev => prev.map(a => a.id === savedActivity.id ? savedActivity : a));
      } else {
        setAtividades(prev => [...prev, savedActivity]);
      }
      
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar, tentando localmente:", err);
      // Fallback local
      if (editingAtividade) {
        setAtividades(prev => prev.map(a => a.id === activityData.id ? activityData : a));
      } else {
        setAtividades(prev => [...prev, activityData]);
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewPin(null);
    setEditingAtividade(null);
    setNewActivityName('');
    setNewActivityDesc('');
    setNewInstagram('');
    setNewWebsite('');
    setSelectedLocalId('');
  };

  const handleEditActivity = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setNewActivityName(atividade.nome);
    setNewActivityDesc(atividade.descricao);
    setNewInstagram(atividade.instagram || '');
    setNewWebsite(atividade.website || '');
    setNewPinType(atividade.tipo);
    setSelectedLocalId(atividade.localPaiId || '');
    setSelectedAtividade(null);
  };

  const handleDeleteActivity = async (atividade: Atividade) => {
    setItemToDelete(atividade);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch('/api/atividades/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemToDelete.id })
      });

      if (!response.ok) throw new Error('Erro ao deletar no servidor');
      
      setAtividades(prev => prev
        .map(a => a.localPaiId === itemToDelete.id ? { ...a, localPaiId: undefined, local: "Campus" } : a)
        .filter(a => a.id !== itemToDelete.id)
      );
      if (selectedAtividade?.id === itemToDelete.id) setSelectedAtividade(null);
      setItemToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar, tentando localmente:", err);
      setAtividades(prev => prev
        .map(a => a.localPaiId === itemToDelete.id ? { ...a, localPaiId: undefined, local: "Campus" } : a)
        .filter(a => a.id !== itemToDelete.id)
      );
      if (selectedAtividade?.id === itemToDelete.id) setSelectedAtividade(null);
      setItemToDelete(null);
    }
  };

  const handleMarkerClick = (atividade: Atividade) => {
    if (!isEditMode) {
      setSelectedAtividade(atividade);
      setNewPin(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl">
        <header className="p-6 border-bottom border-slate-100 bg-indigo-600 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            <Compass className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">
              {APP_CONFIG.title || "Campus Explorer"}
            </h1>
          </div>
          <p className="text-indigo-100 text-sm">
            {APP_CONFIG.subtitle}
          </p>
          
          {/* Edit Mode Toggle */}
          <button 
            onClick={() => {
              setIsEditMode(!isEditMode);
              setNewPin(null);
              setSelectedAtividade(null);
            }}
            className={`absolute top-6 right-6 p-2 rounded-lg transition-all ${
              isEditMode ? 'bg-yellow-400 text-yellow-900' : 'bg-indigo-500 text-indigo-100'
            }`}
            title={isEditMode ? "Sair do Modo de Edição" : "Ativar Modo de Mapeamento"}
          >
            {isEditMode ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </button>
        </header>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {isEditMode && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
              <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4" /> Modo de Mapeamento Ativo
              </h3>
              <p className="text-xs text-yellow-700">Clique em qualquer lugar no mapa para adicionar um novo pin de atividade.</p>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-2">Lista de Atividades</h2>
            {atividades.filter(a => (a.tipo || 'atividade') === 'atividade').length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-sm">
                Nenhuma atividade cadastrada.
              </div>
            ) : (
              atividades
                .filter(a => (a.tipo || 'atividade') === 'atividade')
                .map((a, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleMarkerClick(a)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAtividade?.id === a.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                    : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                      Atividade
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteActivity(a);
                        }}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <MapPin className="w-4 h-4 text-indigo-300" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{a.nome}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.descricao}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{a.local}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Clique para ver mais
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-300" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs border-t border-red-100">
            <strong>Erro:</strong> {error}
          </div>
        )}
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative z-0 p-6 bg-slate-100">
        <div className={`h-full w-full rounded-2xl overflow-hidden shadow-inner border transition-all ${
          isEditMode ? 'border-yellow-400 ring-4 ring-yellow-100' : 'border-slate-200'
        }`}>
          <MapContainer 
            center={APP_CONFIG.campusCoords} 
            zoom={APP_CONFIG.defaultZoom} 
            className="h-full w-full"
            zoomControl={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            boxZoom={false}
            keyboard={false}
            attributionControl={false}
            closeOnClick={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapEvents onMapClick={handleMapClick} isEditMode={isEditMode} />
            
            {/* Pins no Mapa: Locais e Atividades sem local pai */}
            {atividades.filter(a => a.tipo === 'local' || !a.localPaiId).map((a, idx) => (
              <Marker 
                key={a.id || idx} 
                position={[a.latitude, a.longitude]}
                icon={(a.tipo || 'atividade') === 'local' ? localIcon : atividadeIcon}
                eventHandlers={{
                  click: () => handleMarkerClick(a),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} className={`bg-white border-none shadow-md font-bold rounded px-2 py-1 text-[10px] ${
                  (a.tipo || 'atividade') === 'local' ? 'text-blue-600' : 'text-indigo-600'
                }`}>
                  {a.nome}
                </Tooltip>
                <Popup autoPan={false}>
                  <div className="p-1 max-w-[200px]">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className="font-bold text-indigo-600 m-0 leading-tight">{a.nome}</h4>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(a);
                          }}
                          className="text-indigo-400 hover:text-indigo-600 p-1"
                          title="Editar"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteActivity(a);
                          }}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 m-0 mb-2">{a.descricao}</p>
                    
                    {/* Se for um local, mostrar contagem de atividades */}
                    {a.tipo === 'local' && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {atividades.filter(atv => atv.localPaiId === a.id).length} Atividades vinculadas
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{a.local}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {newPin && (
              <Marker position={[newPin.lat, newPin.lng]} icon={newPinType === 'local' ? localIcon : atividadeIcon}>
                <Tooltip permanent direction="top" offset={[0, -10]} className="bg-yellow-400 border-none shadow-md font-bold text-yellow-900 rounded px-2 py-1 text-[10px]">
                  Novo Ponto
                </Tooltip>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Floating Creation/Edit Panel */}
        <AnimatePresence>
          {(newPin || editingAtividade) && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:w-80 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 z-[1000] border-t-4 md:border-2 border-yellow-400 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={resetForm}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
              
              <p className="text-[10px] font-bold text-yellow-600 uppercase mb-4 tracking-widest">
                {editingAtividade ? 'Editar Ponto' : 'Mapear Novo Ponto'}
              </p>
              
              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button 
                  onClick={() => setNewPinType('local')}
                  className={`flex-1 text-[10px] py-2 rounded-md font-bold transition-all ${
                    newPinType === 'local' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  LOCAL
                </button>
                <button 
                  onClick={() => setNewPinType('atividade')}
                  className={`flex-1 text-[10px] py-2 rounded-md font-bold transition-all ${
                    newPinType === 'atividade' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  ATIVIDADE
                </button>
              </div>

              <div className="space-y-3">
                {newPinType === 'atividade' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Vincular a Local (Opcional)</label>
                    <select 
                      className="w-full p-2 text-xs border border-slate-200 rounded-xl outline-none bg-slate-50"
                      value={selectedLocalId}
                      onChange={(e) => setSelectedLocalId(e.target.value)}
                    >
                      <option value="">Nenhum (Usar local do clique)</option>
                      {atividades.filter(a => a.tipo === 'local').map(l => (
                        <option key={l.id} value={l.id}>{l.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    {newPinType === 'local' ? 'Nome do Local' : 'Nome da Atividade'}
                  </label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder={newPinType === 'local' ? "Ex: Bloco A, Ginásio..." : "Ex: Treino de Vôlei, Aula de Dança..."} 
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                  />
                </div>
                
                {newPinType === 'atividade' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Descrição</label>
                      <textarea 
                        placeholder="O que acontece aqui?" 
                        className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 transition-all"
                        value={newActivityDesc}
                        onChange={(e) => setNewActivityDesc(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-3 border border-slate-200 rounded-xl p-2 bg-slate-50">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <input 
                          type="text" 
                          placeholder="@instagram" 
                          className="flex-1 bg-transparent text-xs outline-none"
                          value={newInstagram}
                          onChange={(e) => setNewInstagram(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-3 border border-slate-200 rounded-xl p-2 bg-slate-50">
                        <Globe className="w-4 h-4 text-blue-500" />
                        <input 
                          type="text" 
                          placeholder="Link do Site" 
                          className="flex-1 bg-transparent text-xs outline-none"
                          value={newWebsite}
                          onChange={(e) => setNewWebsite(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveNewActivity}
                    disabled={isSaving || !newActivityName}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700"
                  >
                    {isSaving ? 'Salvando...' : <><Save className="w-4 h-4" /> {editingAtividade ? 'Atualizar Ponto' : 'Salvar Ponto'}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Info Panel (Mobile/Selected) */}
        <AnimatePresence>
          {selectedAtividade && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:w-80 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 z-[1000] border border-slate-100 max-h-[80vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedAtividade(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                  {selectedAtividade.categoria}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditActivity(selectedAtividade)}
                    className="text-indigo-500 hover:text-indigo-700 p-1 bg-indigo-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteActivity(selectedAtividade)}
                    className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedAtividade.nome}</h2>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{selectedAtividade.descricao}</p>

              {/* Se for um Local, listar atividades vinculadas */}
              {selectedAtividade.tipo === 'local' && (
                <div className="mb-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Atividades neste Local</h3>
                  <div className="space-y-2">
                    {atividades.filter(atv => atv.localPaiId === selectedAtividade.id).length > 0 ? (
                      atividades.filter(atv => atv.localPaiId === selectedAtividade.id).map(atv => (
                        <button 
                          key={atv.id}
                          onClick={() => setSelectedAtividade(atv)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{atv.nome}</p>
                            <p className="text-[10px] text-slate-500 truncate w-40">{atv.descricao}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhuma atividade vinculada a este local.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Se for uma Atividade vinculada, mostrar link para o Local */}
              {selectedAtividade.tipo === 'atividade' && selectedAtividade.localPaiId && (
                <div className="mb-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Localização</h3>
                  <button 
                    onClick={() => {
                      const parent = atividades.find(l => l.id === selectedAtividade.localPaiId);
                      if (parent) setSelectedAtividade(parent);
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    {selectedAtividade.local}
                  </button>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span>{selectedAtividade.local}</span>
                </div>
                
                {selectedAtividade.tipo === 'atividade' && (
                  <>
                    {selectedAtividade.instagram && (
                      <a 
                        href={`https://instagram.com/${selectedAtividade.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                          <Instagram className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Instagram</span>
                          <span className="text-[10px] text-slate-400">{selectedAtividade.instagram.startsWith('@') ? selectedAtividade.instagram : `@${selectedAtividade.instagram}`}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 ml-auto text-slate-300" />
                      </a>
                    )}
                    {selectedAtividade.website && (
                      <a 
                        href={selectedAtividade.website.startsWith('http') ? selectedAtividade.website : `https://${selectedAtividade.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Visitar Site</span>
                          <span className="text-[10px] text-slate-400 truncate w-40">{selectedAtividade.website}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 ml-auto text-slate-300" />
                      </a>
                    )}
                  </>
                )}
                
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Info className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-[10px]">Coord: {selectedAtividade.latitude.toFixed(4)}, {selectedAtividade.longitude.toFixed(4)}</span>
                </div>

                <button 
                  onClick={() => setSelectedAtividade(null)}
                  className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors md:hidden"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {itemToDelete && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Confirmar Exclusão</h3>
                <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                  Tem certeza que deseja remover <span className="font-bold text-slate-700">"{itemToDelete.nome}"</span>? 
                  {itemToDelete.tipo === 'local' && " Atividades vinculadas a este local perderão sua referência de localização."}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setItemToDelete(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
