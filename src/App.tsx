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
  const [classifierModal, setClassifierModal] = useState({ isOpen: false });
  const [aiModal, setAiModal] = useState({ isOpen: false, query: '', response: '', isTyping: false });
  const fileInputRef = useRef(null);

  // LECTURA EN TIEMPO REAL: Sincronización automática de Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'inventario'), (snapshot) => {
      const cajasFirebase = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          archivadores: data.archivadores || [] 
        };
      });
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
      await addDoc(collection(db, 'inventario'), {
        name: `Caja Fuerte ${boxes.length + 1}`,
        archivadores: [],
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      showNotification("Error al guardar en la nube", "error");
    }
  };

  // ... (Puedes mantener el resto de tus funciones: addArchivador, handleFileUpload, etc. aquí mismo)
  // Nota: Asegúrate de que todas usen 'updateDoc' o 'addDoc' contra 'db' como en tu original.

  return (
    <div className="min-h-screen bg-slate-100 font-sans p-6 selection:bg-indigo-200">
      {/* ... (Tu diseño JSX original) ... */}
    </div>
  );
};

export default App;