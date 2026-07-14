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
  "TRASLADOS", "MIMEÓGRAFO", "DECOMISO JUZGADO DE POLICÍA LOCAL (J.P.L)", "CORRESPONDENCIA"
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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'inventario'), (snapshot) => {
      const cajasFirebase = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), archivadores: doc.data().archivadores || [] }));
      cajasFirebase.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setBoxes(cajasFirebase);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addBox = async () => {
    try {
      await addDoc(collection(db, 'inventario'), { name: `Caja Fuerte ${boxes.length + 1}`, archivadores: [], timestamp: new Date().toLocaleString() });
      showNotification("Caja creada en la nube");
    } catch (e) { showNotification("Error al guardar", "error"); }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-indigo-700 flex items-center gap-3">
          <Database size={32} /> Archivo Inteligente
        </h1>
      </div>

      <div className="max-w-7xl mx-auto">
        <button onClick={addBox} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold mb-6">
          Crear Nueva Caja
        </button>

        <div className="grid gap-4">
          {boxes.map(box => (
            <div key={box.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-black text-slate-800">{box.name}</h2>
              <p className="text-sm text-slate-500">{box.archivadores.length} archivadores</p>
            </div>
          ))}
        </div>
      </div>

      {notification && (
        <div className="fixed top-6 right-6 bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl">
          {notification.msg}
        </div>
      )}
    </div>
  );
};

export default App;