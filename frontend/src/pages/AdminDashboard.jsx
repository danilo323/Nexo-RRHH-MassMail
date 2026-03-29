import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, PlusCircle, UserCog, Shield, Loader2, Send,
  Pencil, Trash2, Check, X, AlertTriangle, UserMinus
} from 'lucide-react';

function ConfirmModal({ mensaje, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <h3 className="font-bold text-gray-800">Confirmar eliminación</h3>
        </div>
        <p className="text-gray-600 text-sm mb-6">{mensaje}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition">Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

const ROL_BADGE = { admin: 'bg-purple-100 text-purple-700', supervisor: 'bg-blue-100 text-blue-700', operador: 'bg-green-100 text-green-700' };

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('rrhh_token');
  const api = axios.create({ baseURL: 'http://localhost:8000/api', headers: { Authorization: `Bearer ${token}` } });

  // Grupos
  const [grupos, setGrupos] = useState([]);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [loadingGrupo, setLoadingGrupo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [confirmBorrar, setConfirmBorrar] = useState(null);

  // Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Asignación
  const [asignGrupoId, setAsignGrupoId] = useState('');
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);
  const [loadingMiembros, setLoadingMiembros] = useState(false);
  const [asignUserId, setAsignUserId] = useState('');
  const [loadingAsign, setLoadingAsign] = useState(false);
  const [asignMsg, setAsignMsg] = useState({ text: '', ok: true });

  const [tab, setTab] = useState('grupos');
  const esAdmin = user?.rol === 'admin';

  const cargarGrupos = async () => {
    try { const r = await api.get('/grupos/'); setGrupos(r.data); } catch (e) {}
  };

  const cargarUsuarios = async () => {
    setLoadingUsuarios(true);
    try { const r = await api.get('/usuarios/'); setUsuarios(r.data); } catch (e) {}
    finally { setLoadingUsuarios(false); }
  };

  const cargarMiembros = async (grupoId) => {
    if (!grupoId) { setMiembrosGrupo([]); return; }
    setLoadingMiembros(true);
    try { const r = await api.get(`/grupos/${grupoId}/miembros`); setMiembrosGrupo(r.data); }
    catch (e) { setMiembrosGrupo([]); }
    finally { setLoadingMiembros(false); }
  };

  useEffect(() => { cargarGrupos(); cargarUsuarios(); }, []);

  // Cuando cambia el grupo seleccionado en Asignar, cargar miembros
  useEffect(() => { cargarMiembros(asignGrupoId); setAsignMsg({ text: '', ok: true }); }, [asignGrupoId]);

  const handleCreateGrupo = async (e) => {
    e.preventDefault(); setLoadingGrupo(true);
    try { await api.post('/grupos/', { nombre: nombreGrupo }); setNombreGrupo(''); cargarGrupos(); }
    catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoadingGrupo(false); }
  };

  const handleEditarGrupo = async (id) => {
    if (!editNombre.trim()) return;
    try { await api.patch(`/grupos/${id}`, { nombre: editNombre }); setEditandoId(null); setEditNombre(''); cargarGrupos(); }
    catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
  };

  const handleBorrarGrupo = async () => {
    try { await api.delete(`/grupos/${confirmBorrar.id}`); setConfirmBorrar(null); cargarGrupos(); }
    catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
  };

  const handleCambiarRol = async (uid, rol) => {
    try { await api.patch(`/usuarios/${uid}/rol`, { rol }); cargarUsuarios(); }
    catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
  };

  const handleAsignar = async (e) => {
    e.preventDefault();
    if (!asignGrupoId || !asignUserId) return;
    setLoadingAsign(true); setAsignMsg({ text: '', ok: true });
    try {
      const r = await api.post(`/grupos/${asignGrupoId}/asignar`, { user_id: parseInt(asignUserId) });
      setAsignMsg({ text: r.data.msg, ok: true });
      setAsignUserId('');
      cargarMiembros(asignGrupoId);
    } catch (e) { setAsignMsg({ text: e.response?.data?.detail || e.message, ok: false }); }
    finally { setLoadingAsign(false); }
  };

  const handleDesasignar = async (userId, userName) => {
    if (!window.confirm(`¿Quitar a "${userName}" del grupo?`)) return;
    try {
      await api.delete(`/grupos/${asignGrupoId}/desasignar/${userId}`);
      cargarMiembros(asignGrupoId);
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
  };

  // Usuarios no asignados al grupo actual (para el dropdown de asignar)
  const miembrosIds = miembrosGrupo.map(m => m.id);
  const usuariosDisponibles = usuarios.filter(u => !miembrosIds.includes(u.id));

  const ALL_TABS = [
    { id: 'grupos', label: 'Grupos', icon: Users, roles: ['admin', 'supervisor'] },
    { id: 'usuarios', label: esAdmin ? 'Usuarios' : 'Usuarios (Solo lectura)', icon: UserCog, roles: ['admin', 'supervisor'] },
    { id: 'asignar', label: 'Asignar Miembros', icon: Shield, roles: ['admin'] },
  ];
  const TABS = ALL_TABS.filter(t => t.roles.includes(user?.rol));

  return (
    <div className="w-full max-w-5xl mx-auto">
      {confirmBorrar && (
        <ConfirmModal
          mensaje={`¿Seguro que quieres eliminar el grupo "${confirmBorrar.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleBorrarGrupo}
          onCancel={() => setConfirmBorrar(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Nivel: <span className={`font-semibold ${esAdmin ? 'text-purple-600' : 'text-blue-600'}`}>{user?.rol?.toUpperCase()}</span> | {user?.nombre}
          </p>
        </div>
        <button onClick={() => navigate('/nuevo-envio')} className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Send className="w-4 h-4" /> Ir al Wizard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${tab === id ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ══ TAB GRUPOS ══ */}
      {tab === 'grupos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {esAdmin && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-secondary" /> Crear Grupo</h3>
              <form onSubmit={handleCreateGrupo} className="space-y-4">
                <input type="text" value={nombreGrupo} onChange={e => setNombreGrupo(e.target.value)} required placeholder="Ej. Operaciones Sur..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-secondary outline-none transition" />
                <button type="submit" disabled={loadingGrupo}
                  className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-blue-900 transition flex items-center justify-center gap-2">
                  {loadingGrupo ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  {loadingGrupo ? 'Guardando...' : 'Añadir a Base de Datos'}
                </button>
              </form>
            </div>
          )}
          <div className={`${esAdmin ? 'md:col-span-2' : 'md:col-span-3'} bg-white p-6 rounded-2xl shadow-sm border border-gray-100`}>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-secondary" /> Grupos ({grupos.length})</h3>
            {grupos.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">No hay grupos creados.</div>
            ) : (
              <div className="space-y-3">
                {grupos.map(g => (
                  <div key={g.id} className="border border-gray-100 rounded-xl bg-gray-50 hover:border-blue-100 transition">
                    {editandoId === g.id ? (
                      <div className="flex items-center gap-2 p-3">
                        <input autoFocus value={editNombre} onChange={e => setEditNombre(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleEditarGrupo(g.id)}
                          className="flex-1 px-3 py-1.5 border border-secondary rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary outline-none" />
                        <button onClick={() => handleEditarGrupo(g.id)} className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg"><Check size={16} /></button>
                        <button onClick={() => { setEditandoId(null); setEditNombre(''); }} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-white border border-gray-200 font-bold px-2 py-1 rounded-md text-gray-500 shadow-sm">ID: {g.id}</span>
                          <span className="font-bold text-gray-800">{g.nombre}</span>
                        </div>
                        {esAdmin && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditandoId(g.id); setEditNombre(g.nombre); }}
                              className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-secondary rounded-lg transition" title="Editar nombre"><Pencil size={15} /></button>
                            <button onClick={() => setConfirmBorrar({ id: g.id, nombre: g.nombre })}
                              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition" title="Eliminar grupo"><Trash2 size={15} /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB USUARIOS ══ */}
      {tab === 'usuarios' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><UserCog className="w-5 h-5 text-secondary" /> Todos los Usuarios ({usuarios.length})</h3>
            {!esAdmin && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full font-medium">Solo lectura</span>}
          </div>
          {loadingUsuarios ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-secondary animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-100 transition">
                  <div>
                    <p className="font-semibold text-gray-800">{u.nombre}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROL_BADGE[u.rol]}`}>{u.rol}</span>
                    {esAdmin && u.id !== user?.id && (
                      <select value={u.rol} onChange={e => handleCambiarRol(u.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-secondary outline-none">
                        <option value="operador">Operador</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB ASIGNAR MIEMBROS ══ */}
      {tab === 'asignar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Formulario izquierda */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" /> Asignar Miembro al Grupo
            </h3>
            <form onSubmit={handleAsignar} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Seleccionar Grupo</label>
                <select value={asignGrupoId} onChange={e => setAsignGrupoId(e.target.value)} required
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-secondary outline-none bg-white">
                  <option value="">-- Elige un grupo --</option>
                  {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre} (ID: {g.id})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Agregar Usuario</label>
                <select value={asignUserId} onChange={e => setAsignUserId(e.target.value)} required disabled={!asignGrupoId}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-secondary outline-none bg-white disabled:opacity-50">
                  <option value="">-- Elige un usuario --</option>
                  {usuariosDisponibles.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} [{u.rol}] — {u.email}</option>
                  ))}
                </select>
                {asignGrupoId && usuariosDisponibles.length === 0 && (
                  <p className="text-xs text-green-600 mt-1">✅ Todos los usuarios ya están en este grupo.</p>
                )}
              </div>
              {asignMsg.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${asignMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {asignMsg.ok ? '✅ ' : '❌ '}{asignMsg.text}
                </div>
              )}
              <button type="submit" disabled={loadingAsign || !asignGrupoId || !asignUserId}
                className="w-full bg-secondary text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {loadingAsign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {loadingAsign ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
            </form>
          </div>

          {/* Miembros actuales del grupo - derecha */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              {asignGrupoId
                ? `Miembros del Grupo (${miembrosGrupo.length})`
                : 'Selecciona un grupo'}
            </h3>

            {!asignGrupoId && (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                Elige un grupo a la izquierda para ver sus miembros actuales.
              </div>
            )}

            {asignGrupoId && loadingMiembros && (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-secondary animate-spin" /></div>
            )}

            {asignGrupoId && !loadingMiembros && miembrosGrupo.length === 0 && (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                Este grupo no tiene miembros aún. Asigna uno con el formulario.
              </div>
            )}

            {asignGrupoId && !loadingMiembros && miembrosGrupo.length > 0 && (
              <div className="space-y-2">
                {miembrosGrupo.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-red-100 group transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {m.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{m.nombre}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROL_BADGE[m.rol]}`}>{m.rol}</span>
                      <button onClick={() => handleDesasignar(m.id, m.nombre)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                        title="Quitar del grupo">
                        <UserMinus size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
