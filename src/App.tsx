import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, Search, Archive, Trash2, X, Download, Upload,
  Save, AlertCircle, File, ChevronRight, CheckCircle2, Lock, Unlock, Link as LinkIcon, QrCode, FileText, Database, Box, Tag, Bot, FileCheck, Printer
} from 'lucide-react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const App = () => {
  const [boxes, setBoxes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'inventario'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), archivadores: doc.data().archivadores || [] }));
      setBoxes(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });
    return () => unsubscribe();
  }, []);

  const addBox = async () => {
    await addDoc(collection(db, 'inventario'), { name: `Caja Fuerte ${boxes.length + 1}`, archivadores: [], timestamp: new Date().toLocaleString() });
  };

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(boxes));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "Respaldo_Archivo.json";
    a.click();
  };

  const importBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const importedData = JSON.parse(event.target.result);
      for (const box of importedData) {
        const { id, ...boxData } = box;
        await addDoc(collection(db, 'inventario'), boxData);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* HEADER CON BOTONES */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-indigo-700 flex items-center gap-3">
          <Database size={32} /> Archivo Inteligente
        </h1>
        <div className="flex gap-3">
          <button onClick={exportBackup} className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl flex items-center gap-2 border border-slate-300">
            <Download size={18} /> Exportar
          </button>
          <label className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl flex items-center gap-2 border border-slate-300 cursor-pointer">
            <Upload size={18} /> Importar
            <input type="file" onChange={importBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <button onClick={addBox} className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-2xl mb-4">Crear Nueva Caja</button>
        </div>

        <div className="lg:col-span-3">
          {boxes.map(box => (
            <div key={box.id} className="bg-white p-6 mb-4 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-black">{box.name}</h2>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;