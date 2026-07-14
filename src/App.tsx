import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, Search, Archive, Trash2, X, Download, Upload,
  Save, AlertCircle, File, ChevronRight, CheckCircle2, Lock, Unlock, Link as LinkIcon, QrCode, FileText, Database, Box, Tag, Bot, FileCheck, Printer
} from 'lucide-react';
// Importaciones completas de Firebase necesarias para que no quede en blanco
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
  // Estados principales de datos
  const [boxes, setBoxes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [activeArcId, setActiveArcId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Estados de los Modales
  const [deleteAuthModal, setDeleteAuthModal] = useState({ isOpen: false, type: null, targetId: null, parentId: null, password: '' });
  const [linkModal, setLinkModal] = useState({ isOpen: false, boxId: null, arcId: null, name: '', url: '' });
  const [inventoryModal, setInventoryModal] = useState(false);
  const [classifierModal, setClassifierModal] = useState({
    isOpen: false, fileId: null, boxId: null, arcId: null,
    name: '', docType: '', department: '', date: '', rut: '', provider: '', observations: ''
  });
  const [aiModal, setAiModal] = useState({ isOpen: false, query: '', response: '', isTyping: false });
  const fileInputRef = useRef(null);

 // LECTURA EN TIEMPO REAL DESDE FIREBASE
 useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, 'inventario'), (snapshot) => {
    const cajasFirebase = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // ESTA ES LA LÍNEA QUE EVITA EL COLAPSO: Si no hay archivadores, pone una lista vacía []
        archivadores: data.archivadores || [] 
      };
    });
    // Mantiene el orden alfabético de las cajas (evitando fallos si alguna no tiene nombre)
    cajasFirebase.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    setBoxes(cajasFirebase);
  });

  return () => unsubscribe();
}, []);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addBox = async () => {
    const newBox = {
      name: `Caja Fuerte ${boxes.length + 1}`,
      archivadores: [],
      timestamp: new Date().toLocaleString()
    };
    try {
      await addDoc(collection(db, 'inventario'), newBox);
      showNotification("Nueva caja agregada exitosamente");
    } catch (error) {
      showNotification("Error al guardar en la nube", "error");
    }
  };

  const addArchivador = async (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    const newArchivador = {
      id: Date.now().toString(),
      name: `Archivador ${box.archivadores.length + 1}`,
      files: [],
      timestamp: new Date().toLocaleString()
    };

    try {
      await updateDoc(doc(db, 'inventario', boxId), {
        archivadores: [...box.archivadores, newArchivador]
      });
      showNotification("Archivador creado");
    } catch (error) {
      showNotification("Error al crear archivador", "error");
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (event, boxId, arcId) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setNotification({ msg: "Subiendo archivos a la nube...", type: "info" });
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    try {
        const newFilesPromises = files.map(async (file) => {
            const content = await fileToBase64(file);
            return {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type,
                size: file.size,
                content: content,
                isExternalLink: false,
                timestamp: new Date().toLocaleString()
            };
        });

        const resolvedFiles = await Promise.all(newFilesPromises);

        const updatedArchivadores = box.archivadores.map(arc => {
            if (arc.id === arcId) {
                return { ...arc, files: [...arc.files, ...resolvedFiles] };
            }
            return arc;
        });

        await updateDoc(doc(db, 'inventario', boxId), {
            archivadores: updatedArchivadores
        });

        showNotification("Archivos guardados en la nube");
    } catch (error) {
        showNotification("Error al procesar el archivo", "error");
    }
    
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitLink = async () => {
    if (!linkModal.name || !linkModal.url) {
        showNotification("Completa todos los campos", "error");
        return;
    }
    
    const box = boxes.find(b => b.id === linkModal.boxId);
    if (!box) return;

    try {
        const updatedArchivadores = box.archivadores.map(arc => {
            if (arc.id === linkModal.arcId) {
                return {
                    ...arc,
                    files: [...arc.files, {
                        id: Date.now().toString(),
                        name: linkModal.name,
                        isExternalLink: true,
                        url: linkModal.url,
                        type: 'Link Externo',
                        timestamp: new Date().toLocaleString()
                    }]
                };
            }
            return arc;
        });

        await updateDoc(doc(db, 'inventario', linkModal.boxId), {
            archivadores: updatedArchivadores
        });

        setLinkModal({ isOpen: false, boxId: null, arcId: null, name: '', url: '' });
        showNotification("Enlace guardado en la nube");
    } catch (error) {
        showNotification("Error al guardar enlace", "error");
    }
  };

  const downloadFile = (file) => {
    if (file.isExternalLink) {
        window.open(file.url, '_blank');
        return;
    }

    setDownloadingId(file.id);
    try {
        const a = document.createElement("a");
        a.href = file.content;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification("Descargando...");
    } catch (e) {
        showNotification("Error al descargar", "error");
    } finally {
        setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  const promptDelete = (type, targetId, parentId = null) => {
    setDeleteAuthModal({ isOpen: true, type, targetId, parentId, password: '' });
  };

  const confirmDelete = async () => {
    if (deleteAuthModal.type === 'box' && deleteAuthModal.password !== '1335') {
        showNotification("Clave incorrecta para cajas", "error");
        return;
    }
    if ((deleteAuthModal.type === 'arc' || deleteAuthModal.type === 'doc') && deleteAuthModal.password !== '7472') {
        showNotification("Clave incorrecta", "error");
        return;
    }

    try {
        if (deleteAuthModal.type === 'box') {
            await deleteDoc(doc(db, 'inventario', deleteAuthModal.targetId));
            if (activeBoxId === deleteAuthModal.targetId) setActiveBoxId(null);
            showNotification("Caja eliminada");
        } else if (deleteAuthModal.type === 'arc') {
            const box = boxes.find(b => b.id === deleteAuthModal.parentId);
            const updatedArchivadores = box.archivadores.filter(a => a.id !== deleteAuthModal.targetId);
            await updateDoc(doc(db, 'inventario', deleteAuthModal.parentId), {
                archivadores: updatedArchivadores
            });
            showNotification("Archivador eliminado");
        } else if (deleteAuthModal.type === 'doc') {
            const box = boxes.find(b => b.id === deleteAuthModal.parentId.boxId);
            const updatedArchivadores = box.archivadores.map(arc => {
                if (arc.id === deleteAuthModal.parentId.arcId) {
                    return { ...arc, files: arc.files.filter(f => f.id !== deleteAuthModal.targetId) };
                }
                return arc;
            });
            await updateDoc(doc(db, 'inventario', deleteAuthModal.parentId.boxId), {
                archivadores: updatedArchivadores
            });
            showNotification("Documento eliminado");
        }
    } catch (error) {
        showNotification("Error al eliminar", "error");
    }
    
    setDeleteAuthModal({ isOpen: false, type: null, targetId: null, parentId: null, password: '' });
  };

  const openClassifier = (file, boxId, arcId) => {
    setClassifierModal({
      isOpen: true,
      fileId: file.id, boxId, arcId,
      name: file.name,
      docType: file.docType || '',
      department: file.department || '',
      date: file.date || '',
      rut: file.rut || '',
      provider: file.provider || '',
      observations: file.observations || ''
    });
  };

  const saveClassification = async () => {
    const box = boxes.find(b => b.id === classifierModal.boxId);
    if (!box) return;

    try {
        const updatedArchivadores = box.archivadores.map(arc => {
            if (arc.id === classifierModal.arcId) {
                return {
                    ...arc,
                    files: arc.files.map(f => {
                        if (f.id === classifierModal.fileId) {
                            return {
                                ...f,
                                name: classifierModal.name || f.name,
                                docType: classifierModal.docType,
                                department: classifierModal.department,
                                date: classifierModal.date,
                                rut: classifierModal.rut,
                                provider: classifierModal.provider,
                                observations: classifierModal.observations
                            };
                        }
                        return f;
                    })
                };
            }
            return arc;
        });

        await updateDoc(doc(db, 'inventario', classifierModal.boxId), {
            archivadores: updatedArchivadores
        });

        setClassifierModal({ isOpen: false });
        showNotification("Documento clasificado correctamente");
    } catch (error) {
        showNotification("Error al clasificar", "error");
    }
  };

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(boxes));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "Respaldo_Archivo_" + new Date().toLocaleDateString() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                setNotification({ msg: "Sincronizando respaldo con la nube...", type: "info" });
                for (const box of importedData) {
                    const { id, ...boxDataWithoutId } = box;
                    await addDoc(collection(db, 'inventario'), boxDataWithoutId);
                }
                showNotification("Respaldo importado y sincronizado exitosamente");
            } else {
                showNotification("Archivo inválido", "error");
            }
        } catch(error) {
            showNotification("Error de formato en archivo", "error");
        }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const handleAskAI = () => {
    if (!aiModal.query.trim()) return;
    setAiModal(prev => ({ ...prev, isTyping: true, response: '' }));
    
    setTimeout(() => {
        const query = aiModal.query.toLowerCase();
        let results = [];
        let totalDocs = 0;
        
        boxes.forEach(b => {
            b.archivadores.forEach(a => {
                a.files.forEach(f => {
                    totalDocs++;
                    const searchString = `${f.name} ${f.docType || ''} ${f.department || ''} ${f.rut || ''} ${f.provider || ''} ${f.observations || ''}`.toLowerCase();
                    if (searchString.includes(query)) {
                        results.push(`- "${f.name}" (Ubicación: ${b.name} > ${a.name})\n  Detalles: Tipo: ${f.docType || 'N/A'} | Depto: ${f.department || 'N/A'} | RUT: ${f.rut || 'N/A'} | Proveedor: ${f.provider || 'N/A'}`);
                    }
                });
            });
        });

        let responseText = "";
        if (query.includes('resumen') || query.includes('cuántos') || query.includes('cuantos')) {
            responseText = `He analizado el inventario completo. Actualmente el sistema custodia un total de ${totalDocs} documentos organizados en ${boxes.length} cajas fuertes.\n\n`;
        }

        if (results.length > 0) {
            responseText += `He encontrado ${results.length} coincidencias precisas para tu búsqueda:\n\n${results.join('\n\n')}`;
        } else if (!responseText) {
            responseText = `No he encontrado documentos que coincidan exactamente con "${aiModal.query}". Prueba buscar por palabras clave, RUT o Nombre del Proveedor.`;
        }

        setAiModal(prev => ({ ...prev, isTyping: false, response: responseText }));
    }, 1500);
  };

  const exportAIPDF = () => {
    const printWindow = window.open('', '_blank');
    const html = `
        <html>
            <head>
                <title>Informe IA - Sistema de Archivo</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                    .header { border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h1 { color: #4f46e5; margin: 0; }
                    .footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; }
                    pre { white-space: pre-wrap; font-family: Arial, sans-serif; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .query { font-style: italic; color: #475569; background: #e0e7ff; padding: 10px; border-radius: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Reporte Inteligente de Archivo</h1>
                    <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
                </div>
                <div class="content">
                    <h3>Consulta Realizada:</h3>
                    <div class="query">"${aiModal.query}"</div>
                    <h3>Análisis y Resultados:</h3>
                    <pre>${aiModal.response}</pre>
                </div>
                <div class="footer">Documento generado automáticamente por IA. Sistema de Archivo Inteligente.</div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintQR = (box) => {
    const printWindow = window.open('', '_blank');
    let docListHtml = '';
    
    box.archivadores.forEach(arc => {
        if(arc.files.length > 0) {
            docListHtml += `<h4 style="margin: 10px 0 5px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0;">📂 ${arc.name}</h4><ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #475569;">`;
            arc.files.forEach(f => {
                docListHtml += `<li><b>${f.name}</b> ${f.docType ? `[${f.docType}]` : ''} ${f.provider ? `(${f.provider})` : ''}</li>`;
            });
            docListHtml += `</ul>`;
        }
    });

    const html = `
        <html>
            <head>
                <title>Etiqueta QR - ${box.name}</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; padding: 20px; background: #fff; }
                    .label { border: 3px dashed #cbd5e1; padding: 20px; width: 400px; text-align: center; border-radius: 12px; }
                    .title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #0f172a; }
                    .qr { width: 150px; height: 150px; margin: 10px auto; border: 4px solid #fff; outline: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; }
                    .docs { text-align: left; margin-top: 20px; border-top: 2px dashed #cbd5e1; padding-top: 15px; }
                </style>
            </head>
            <body>
                <div class="label">
                    <h2 class="title">📦 ${box.name}</h2>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('Inventario de Caja: ' + box.name)}" alt="QR Code" class="qr" />
                    <p style="font-size: 12px; color: #64748b; font-weight: bold;">Etiqueta de Sistema Nube</p>
                    <div class="docs">
                        <h3 style="font-size: 14px; margin-bottom: 5px; color: #334155;">Contenido de Archivadores:</h3>
                        ${docListHtml || '<p style="font-size: 12px; color: #94a3b8; font-style: italic;">Caja sin documentos</p>'}
                    </div>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadInventory = () => {
    let text = "=== INVENTARIO COMPLETO DEL SISTEMA ===\n\n";
    boxes.forEach(box => {
        text += `[ CAJA: ${box.name} ]\n`;
        box.archivadores.forEach(arc => {
            text += `  └─ Archivador: ${arc.name}\n`;
            arc.files.forEach(f => {
                text += `      ├─ ${f.name} ${f.docType ? `(Tipo: ${f.docType})` : ''} ${f.provider ? `(Prov: ${f.provider})` : ''}\n`;
            });
        });
        text += "\n";
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventario_Completo_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredBoxes = () => {
    if (!searchQuery) return boxes;
    const query = searchQuery.toLowerCase();
    
    return boxes.map(box => {
        const filteredArcs = box.archivadores.map(arc => {
            const filteredFiles = arc.files.filter(f => 
                f.name.toLowerCase().includes(query) ||
                (f.docType || '').toLowerCase().includes(query) ||
                (f.department || '').toLowerCase().includes(query) ||
                (f.rut || '').toLowerCase().includes(query) ||
                (f.provider || '').toLowerCase().includes(query) ||
                (f.observations || '').toLowerCase().includes(query)
            );
            return { ...arc, files: filteredFiles };
        }).filter(arc => arc.files.length > 0 || arc.name.toLowerCase().includes(query));
        
        return { ...box, archivadores: filteredArcs };
    }).filter(box => box.archivadores.length > 0 || box.name.toLowerCase().includes(query));
  };

  const filteredBoxes = getFilteredBoxes();

  return (
    <div className="min-h-screen bg-slate-100 font-sans p-6 selection:bg-indigo-200">
      
      {/* --- NOTIFICACIONES --- */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all animate-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} className="text-emerald-400" />}
          <p className="font-semibold">{notification.msg}</p>
        </div>
      )}

      {/* --- HEADER SUPERIOR --- */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-600 flex items-center gap-3">
            <Database className="text-indigo-600" size={32} /> 
            Archivo Inteligente
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gestión Documental y Búsqueda Avanzada</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => setAiModal({ ...aiModal, isOpen: true })} className="px-4 py-2 font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl flex items-center gap-2 shadow-lg transition-all transform hover:scale-105">
            <Bot size={20} /> Asistente IA
          </button>
          
          <div className="h-10 border-l-2 border-slate-200 mx-2"></div>
          
          <button onClick={exportBackup} className="px-4 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors border border-slate-300" title="Descargar Respaldo JSON">
            <Download size={18} /> Exportar
          </button>
          
          <label className="px-4 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors border border-slate-300 cursor-pointer" title="Cargar Respaldo JSON">
            <Upload size={18} /> Importar
            <input type="file" accept=".json" onChange={importBackup} className="hidden" />
          </label>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* --- PANEL IZQUIERDO: CONTROLES --- */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-6">
            
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3.5 text-indigo-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar RUT, depto, doc..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <button 
              onClick={addBox}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mb-4 transition-colors shadow-lg shadow-slate-200"
            >
              <Archive size={20} /> Crear Nueva Caja
            </button>

            <button 
              onClick={() => setInventoryModal(true)}
              className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors border-2 border-indigo-200"
            >
              <FileText size={20} /> Ver Inventario
            </button>
            
            {boxes.length > 0 && (
               <div className="mt-8 text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <p className="text-sm font-semibold text-slate-500 mb-1">Cajas Protegidas</p>
                   <p className="text-2xl font-black text-slate-800">{boxes.length}</p>
               </div>
            )}
          </div>
        </div>

        {/* --- PANEL DERECHO: VISTA DE CAJAS --- */}
        <div className="lg:col-span-3 space-y-6">
          {filteredBoxes.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 flex flex-col items-center">
                <Box size={64} className="text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-500">No hay cajas o no se encontraron resultados.</h3>
                <p className="text-slate-400 mt-2">Crea una nueva caja para empezar a clasificar.</p>
            </div>
          ) : (
            filteredBoxes.map(box => (
              <div key={box.id} className={`bg-white rounded-3xl border border-slate-200 overflow-hidden transition-all duration-300 ${activeBoxId === box.id ? 'shadow-xl ring-2 ring-indigo-500/20' : 'shadow-sm hover:shadow-md'}`}>
                
                {/* CABECERA DE LA CAJA */}
                <div 
                  className={`p-6 cursor-pointer flex items-center justify-between transition-colors ${activeBoxId === box.id ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-slate-50'}`}
                  onClick={() => setActiveBoxId(activeBoxId === box.id ? null : box.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${activeBoxId === box.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
                      <Box size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">{box.name}</h2>
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                        {box.archivadores.length} archivadores • {box.archivadores.reduce((acc, arc) => acc + arc.files.length, 0)} documentos
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handlePrintQR(box)} className="p-2.5 text-slate-600 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm" title="Imprimir Etiqueta QR de la Caja">
                        <QrCode size={20} />
                    </button>
                    {!searchQuery && (
                        <button onClick={() => promptDelete('box', box.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <ChevronRight size={24} className={`text-slate-400 transition-transform duration-300 ${activeBoxId === box.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* CONTENIDO DE LA CAJA */}
                {activeBoxId === box.id && (
                  <div className="p-6 bg-slate-50/50 animate-in slide-in-from-top-2">
                    {!searchQuery && (
                      <button onClick={() => addArchivador(box.id)} className="mb-6 px-5 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl flex items-center gap-2 transition-colors border border-indigo-200 shadow-sm">
                        <FolderPlus size={18} /> Añadir Archivador
                      </button>
                    )}

                    <div className="grid gap-6">
                      {box.archivadores.length === 0 ? (
                        <p className="text-slate-500 italic text-center py-4 bg-white rounded-xl border border-slate-200">Caja vacía. Añade un archivador primero.</p>
                      ) : (
                        box.archivadores.map(arc => (
                          <div key={arc.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                              <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                <Archive size={18} className="text-indigo-400" /> {arc.name}
                              </h3>
                              <div className="flex gap-2">
                                <input 
                                  type="file" 
                                  multiple 
                                  className="hidden" 
                                  ref={fileInputRef}
                                  onChange={(e) => handleFileUpload(e, box.id, arc.id)} 
                                />
                                {!searchQuery && (
                                  <>
                                    <button onClick={() => fileInputRef.current.click()} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 transition-colors">
                                      <Upload size={16} /> Subir PDF/Imagen
                                    </button>
                                    <button onClick={() => setLinkModal({ isOpen: true, boxId: box.id, arcId: arc.id, name: '', url: '' })} className="px-3 py-1.5 text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-emerald-200">
                                      <LinkIcon size={16} /> Link Externo
                                    </button>
                                    <button onClick={() => promptDelete('arc', arc.id, box.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                      <Trash2 size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {arc.files.length === 0 ? (
                                <p className="text-sm text-slate-400 italic col-span-2">Archivador vacío.</p>
                              ) : (
                                arc.files.map(file => (
                                  <div key={file.id} className="group relative bg-slate-50 border border-slate-200 p-4 rounded-xl hover:border-indigo-300 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          {file.isExternalLink ? <LinkIcon size={16} className="text-emerald-500 flex-shrink-0" /> : <File size={16} className="text-indigo-500 flex-shrink-0" />}
                                          <p className="font-bold text-slate-700 truncate" title={file.name}>{file.name}</p>
                                        </div>
                                        
                                        {/* ETIQUETAS DEL CLASIFICADOR */}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {file.docType && <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{file.docType}</span>}
                                            {file.department && <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{file.department}</span>}
                                            {file.rut && <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">RUT: {file.rut}</span>}
                                        </div>
                                        {file.provider && <p className="text-xs text-slate-500 mt-1.5 font-medium truncate">Prov: {file.provider}</p>}
                                      </div>

                                      <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                                        <button onClick={() => openClassifier(file, box.id, arc.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Clasificador de Documento">
                                          <Tag size={16} />
                                        </button>
                                        <button onClick={() => downloadFile(file)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Ver / Descargar">
                                          {downloadingId === file.id ? <AlertCircle size={16} className="animate-spin" /> : file.isExternalLink ? <LinkIcon size={16} /> : <Download size={16} />}
                                        </button>
                                        {!searchQuery && (
                                          <button onClick={() => promptDelete('doc', file.id, { boxId: box.id, arcId: arc.id })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Eliminar">
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </div>

                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      
      {/* MODAL CLASIFICADOR DE DOCUMENTO */}
      {classifierModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6 border-b pb-4">
              <FileCheck className="text-indigo-600" /> Clasificador de Documento
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Archivo</label>
                <input type="text" value={classifierModal.name} onChange={e => setClassifierModal({...classifierModal, name: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Documento</label>
                  <input list="docTypesList" value={classifierModal.docType} onChange={e => setClassifierModal({...classifierModal, docType: e.target.value})} placeholder="Escribe para buscar tipo..." className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium" />
                  <datalist id="docTypesList">
                    {DOC_TYPES.map(type => <option key={type} value={type} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Departamento</label>
                  <input list="deptsList" value={classifierModal.department} onChange={e => setClassifierModal({...classifierModal, department: e.target.value})} placeholder="Escribe para buscar departamento..." className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium" />
                  <datalist id="deptsList">
                    {DEPARTMENTS.map(dept => <option key={dept} value={dept} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <h4 className="md:col-span-2 font-bold text-slate-800 text-sm bg-slate-100 p-2 rounded-lg inline-block">Datos del Proveedor o Solicitante</h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">RUT</label>
                    <input type="text" value={classifierModal.rut} onChange={e => setClassifierModal({...classifierModal, rut: e.target.value})} placeholder="Ej: 12.345.678-9" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Proveedor / Persona</label>
                    <input type="text" value={classifierModal.provider} onChange={e => setClassifierModal({...classifierModal, provider: e.target.value})} placeholder="Ej: Juan Pérez / Empresa S.A." className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium" />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Observaciones Extras</label>
                  <textarea value={classifierModal.observations} onChange={e => setClassifierModal({...classifierModal, observations: e.target.value})} placeholder="Añade notas, quién entrega, quién recibe..." className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 font-medium" rows="2" />
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button onClick={() => setClassifierModal({ isOpen: false })} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={saveClassification} className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-lg transition-colors">
                <Save size={18} /> Guardar Clasificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR / AUTORIZACIÓN */}
      {deleteAuthModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Autorización Requerida</h3>
            <p className="text-sm text-slate-500 mb-6">Ingresa la clave maestra para eliminar este {deleteAuthModal.type === 'box' ? 'Caja' : deleteAuthModal.type === 'arc' ? 'Archivador' : 'Documento'}.</p>
            <input type="password" value={deleteAuthModal.password} onChange={(e) => setDeleteAuthModal({...deleteAuthModal, password: e.target.value})} placeholder="Clave de seguridad..." className="w-full text-center text-xl tracking-widest bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500 font-bold mb-6" autoFocus />
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteAuthModal({ isOpen: false })} className="px-5 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmDelete} className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-2 shadow-lg shadow-rose-200 transition-colors"><Unlock size={18} /> Autorizar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR LINK */}
      {linkModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2"><LinkIcon className="text-emerald-600" /> Guardar Link Manual</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                <input type="text" value={linkModal.name} onChange={(e) => setLinkModal({...linkModal, name: e.target.value})} placeholder="Ej: Carpeta Drive..." className="w-full border border-slate-300 rounded-xl px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">URL</label>
                <input type="url" value={linkModal.url} onChange={(e) => setLinkModal({...linkModal, url: e.target.value})} placeholder="https://..." className="w-full border border-slate-300 rounded-xl px-4 py-2" />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setLinkModal({ isOpen: false })} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={submitLink} className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">Guardar Link</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INVENTARIO COMPLETO */}
      {inventoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Box className="text-indigo-600" /> Inventario Completo del Sistema</h3>
              <div className="flex gap-2">
                <button onClick={downloadInventory} className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-sm"><Download size={18} /> Descargar TXT</button>
                <button onClick={() => setInventoryModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {boxes.map(box => (
                <div key={box.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Box className="text-indigo-500" /> {box.name}</h4>
                    <button onClick={() => handlePrintQR(box)} className="px-4 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-2"><QrCode size={16} /> Imprimir QR</button>
                  </div>
                  <div className="space-y-4">
                    {box.archivadores.map(arc => (
                      <div key={arc.id} className="ml-4 pl-4 border-l-2 border-indigo-100">
                        <h5 className="font-bold text-slate-700 mb-2">{arc.name}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {arc.files.map(file => (
                              <div key={file.id} className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1">
                                <p className="font-semibold text-slate-700">{file.name}</p>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-1 mt-1">
                                  {file.docType && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{file.docType}</span>}
                                  {file.department && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{file.department}</span>}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASISTENTE IA */}
      {aiModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2"><Bot size={24} /> Asistente Inteligente</h3>
              <button onClick={() => setAiModal({...aiModal, isOpen: false})} className="p-1 hover:bg-white/20 rounded-lg"><X size={24} /></button>
            </div>
            
            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm text-sm text-slate-600 mb-4">
                <p><strong>👋 ¡Hola!</strong> Soy el asistente de tu archivo. Puedes preguntarme cosas como:</p>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-indigo-700">
                  <li>"Hazme un resumen de los documentos"</li>
                  <li>"Busca documentos del proveedor Juan Pérez"</li>
                  <li>"¿Dónde hay facturas de Finanzas?"</li>
                </ul>
              </div>

              {aiModal.response && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-slate-700 text-sm whitespace-pre-wrap">
                  {aiModal.response}
                  <div className="mt-4 pt-4 border-t border-indigo-200 flex justify-end">
                      <button onClick={exportAIPDF} className="px-4 py-2 font-bold text-indigo-700 bg-white hover:bg-indigo-100 rounded-xl flex items-center gap-2 shadow-sm border border-indigo-200"><Printer size={16} /> Exportar a PDF</button>
                  </div>
                </div>
              )}
              {aiModal.isTyping && (
                <div className="mt-4 p-4 text-indigo-500 font-semibold flex items-center gap-2 animate-pulse">
                  <Bot size={20} /> Analizando el inventario...
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
              <input type="text" value={aiModal.query} onChange={(e) => setAiModal({...aiModal, query: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleAskAI()} placeholder="Pregúntale a la IA sobre tus documentos..." className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
              <button onClick={handleAskAI} disabled={aiModal.isTyping} className="px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">Consultar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;