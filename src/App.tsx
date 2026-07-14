import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, Search, Archive, Trash2, X, Download, Upload,
  Save, AlertCircle, File, ChevronRight, CheckCircle2, Lock, Unlock, Link as LinkIcon, QrCode, FileText, Database, Box, Tag, Bot, FileCheck, Printer
} from 'lucide-react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const DEPARTMENTS = [
  "Administración Municipal", "Administración y Finanzas (DAF)", "Alcaldía", "Asesoría Jurídica", 
  "Bienestar", "Bodega Central e Inventario", "Control (Dirección de Control)", 
  "DIDECO (Dirección de Desarrollo Comunitario)", "Dirección de Desarrollo de la Niñez", 
  "Dirección de Gestión Ambiental", "Dirección de Informática", "Dirección de Seguridad Humana", 
  "Dirección de Tránsito", "Discapacidad", "Gabinete", "Ingeniería y Señalización", 
  "Inspección Municipal", "Juzgado de Policía Local", "Obras Municipales", "Permisos de Circulación", 
  "Personas Mayores", "Planificación Financiera", "Programa Centro de la Mujer", "Programas Sociales", 
  "Recursos Humanos (RR.HH.)", "SECPLA (Secretaría Comunal de Planificación)", "Secretaría Municipal", 
  "Servicios Generales", "Servicios Operativos Generales", "Tesorería", "Transporte"
];

const DOC_TYPES = [
  "SALIDAS MANUALES", "SALIDAS INSICO", "PERMISOS ADMINISTRATIVOS Y VACACIONES", "VALES DE GAS", 
  "SALIDAS DE INFORMÁTICA", "HOJAS DE ENVÍO Y MEMOS", "REMATES", "ALTAS DE INVENTARIO", 
  "TRASLADOS", "MIMEÓGRAFO", "DECOMISO JUZGADO DE POLICÍA LOCAL (J.P.L)", "CORRESPONDENCIA", 
  "DONACIONES", "ENTREGA DE TÓNER (SALIDA)", "RESMAS CARTA (SALIDA)", "RESMAS OFICIO (SALIDA)", 
  "CORREO ELECTRÓNICO", "ACTAS DE ENTREGA", "FACTURA", "GUÍA"
];

const App = () => {
  const [boxes, setBoxes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [deleteAuthModal, setDeleteAuthModal] = useState({ isOpen: false, type: null, targetId: null, parentId: null, password: '' });
  const [linkModal, setLinkModal] = useState({ isOpen: false, boxId: null, arcId: null, name: '', url: '' });
  const [inventoryModal, setInventoryModal] = useState(false);
  const [classifierModal, setClassifierModal] = useState({ isOpen: false, fileId: null, boxId: null, arcId: null, name: '', docType: '', department: '', date: '', rut: '', provider: '', observations: '' });
  const [aiModal, setAiModal] = useState({ isOpen: false, query: '', response: '', isTyping: false });
  const fileInputRef = useRef(null);

  // Sincronización en tiempo real con Firebase
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
    a.download = `Respaldo_Archivo_${new Date().toLocaleDateString()}.json`;
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
    <div className="min-h-screen bg-slate-100 font-sans p-6">
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-indigo-700 flex items-center gap-3"><Database size={32} /> Archivo Inteligente</h1>
        <div className="flex gap-3">
          <button onClick={() => setAiModal({ ...aiModal, isOpen: true })} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2"><Bot size={20} /> Asistente IA</button>
          <button onClick={exportBackup} className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold flex items-center gap-2"><Download size={18} /> Exportar</button>
          <label className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold flex items-center gap-2 cursor-pointer"><Upload size={18} /> Importar <input type="file" onChange={importBackup} className="hidden" /></label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit">
          <input className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 mb-4" placeholder="Buscar RUT, depto, doc..." onChange={(e) => setSearchQuery(e.target.value)} />
          <button onClick={addBox} className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-2xl mb-4">Crear Nueva Caja</button>
          <button onClick={() => setInventoryModal(true)} className="w-full py-3.5 bg-indigo-50 text-indigo-700 font-bold rounded-2xl border-2 border-indigo-200">Ver Inventario</button>
        </div>
        <div className="lg:col-span-3">
          {boxes.length === 0 ? <div className="text-center p-16 border-2 border-dashed rounded-3xl text-slate-500 font-bold">No hay cajas o no se encontraron resultados.</div> : boxes.map(box => <div key={box.id} className="bg-white p-6 mb-4 rounded-3xl border border-slate-200 shadow-sm cursor-pointer" onClick={() => setActiveBoxId(box.id)}><h2 className="text-2xl font-black">{box.name}</h2></div>)}
        </div>
      </div>
    </div>
  );
};

export default App;