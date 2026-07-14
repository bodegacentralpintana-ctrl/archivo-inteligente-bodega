import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, Search, Archive, Trash2, X, Download, Upload,
  Save, AlertCircle, File, ChevronRight, CheckCircle2, Lock, Unlock, Link as LinkIcon, QrCode, FileText, Database, Box, Tag, Bot, FileCheck, Printer
} from 'lucide-react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// ... (Manten tus constantes DEPARTMENTS y DOC_TYPES aquí mismo) ...

const App = () => {
  const [boxes, setBoxes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // LECTURA EN TIEMPO REAL DESDE FIREBASE
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'inventario'), (snapshot) => {
      const cajasFirebase = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        archivadores: doc.data().archivadores || []
      }));
      cajasFirebase.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setBoxes(cajasFirebase);
    });
    return () => unsubscribe();
  }, []);

  const addBox = async () => {
    await addDoc(collection(db, 'inventario'), {
      name: `Caja Fuerte ${boxes.length + 1}`,
      archivadores: [],
      timestamp: new Date().toLocaleString()
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans p-6">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-indigo-700 flex items-center gap-3">
          <Database size={32} /> Archivo Inteligente
        </h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2">
            <Bot size={20} /> Asistente IA
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* PANEL LATERAL */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <input 
            type="text" 
            placeholder="Buscar RUT, depto, doc..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 mb-4"
          />
          <button onClick={addBox} className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-2xl mb-4">
            Crear Nueva Caja
          </button>
        </div>

        {/* PANEL DERECHO */}
        <div className="lg:col-span-3 space-y-6">
          {boxes.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                <Box size={64} className="text-slate-300 mb-4 mx-auto" />
                <h3 className="text-xl font-bold text-slate-500">No hay cajas o no se encontraron resultados.</h3>
                <p className="text-slate-400 mt-2">Crea una nueva caja para empezar a clasificar.</p>
            </div>
          ) : (
            boxes.map(box => (
              <div key={box.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black">{box.name}</h2>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;