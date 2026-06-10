// ============================================
// CLUB PYP — Admin Teams & Roster Page
// ============================================
// Full CRUD: Equipos + Nómina de jugadores
// Connected to Supabase (NOT demo store)

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTeams, getTeamWithPlayers, createTeam, updateTeam, deleteTeam,
  addPlayer, updatePlayer, removePlayer,
  Team, Player, CreateTeamInput, CreatePlayerInput,
} from '../lib/teams';
import { useAppStore } from '../stores/appStore';

type ModalState =
  | { type: 'none' }
  | { type: 'addTeam' }
  | { type: 'editTeam'; team: Team }
  | { type: 'addPlayer'; teamId: string }
  | { type: 'editPlayer'; player: Player }
  | { type: 'confirmDelete'; entityType: 'team' | 'player'; id: string; name: string };

export default function AdminTeamsPage() {
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<(Team & { players: Player[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [saving, setSaving] = useState(false);

  // Form state
  const [teamForm, setTeamForm] = useState<CreateTeamInput>({ name: '', short_name: '', league: 'Torneo Local', color: '#d72a22' });
  const [playerForm, setPlayerForm] = useState<CreatePlayerInput & { age_str: string }>({ team_id: '', name: '', age_str: '', is_captain: false });

  // ─── Load Teams ───────────────────────────

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTeams();
      setTeams(data);
    } catch (err: any) {
      addToast('error', `Error cargando equipos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // ─── Load Team Detail ─────────────────────

  async function handleSelectTeam(teamId: string) {
    try {
      const data = await getTeamWithPlayers(teamId);
      setSelectedTeam(data);
    } catch (err: any) {
      addToast('error', `Error: ${err.message}`);
    }
  }

  // ─── Team CRUD ────────────────────────────

  async function handleSaveTeam() {
    if (!teamForm.name.trim() || !teamForm.short_name.trim()) {
      addToast('error', 'Nombre y abreviatura son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (modal.type === 'editTeam') {
        await updateTeam(modal.team.id, teamForm);
        addToast('success', `Equipo "${teamForm.name}" actualizado`);
      } else {
        await createTeam(teamForm);
        addToast('success', `Equipo "${teamForm.name}" creado exitosamente`);
      }
      setModal({ type: 'none' });
      await loadTeams();
      if (selectedTeam) await handleSelectTeam(selectedTeam.id);
    } catch (err: any) {
      addToast('error', `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTeam(id: string) {
    setSaving(true);
    try {
      await deleteTeam(id);
      addToast('success', 'Equipo eliminado');
      setModal({ type: 'none' });
      if (selectedTeam?.id === id) setSelectedTeam(null);
      await loadTeams();
    } catch (err: any) {
      addToast('error', `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ─── Player CRUD ──────────────────────────

  async function handleSavePlayer() {
    if (!playerForm.name.trim()) {
      addToast('error', 'El nombre del jugador es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const age = playerForm.age_str ? parseInt(playerForm.age_str, 10) : undefined;

      if (modal.type === 'editPlayer') {
        await updatePlayer(modal.player.id, {
          name: playerForm.name,
          age,
          photo_url: playerForm.photo_url,
          is_captain: playerForm.is_captain,
        });
        addToast('success', `Jugador "${playerForm.name}" actualizado`);
      } else {
        await addPlayer({
          team_id: playerForm.team_id,
          name: playerForm.name,
          age,
          photo_url: playerForm.photo_url,
          is_captain: playerForm.is_captain,
        });
        addToast('success', `Jugador "${playerForm.name}" agregado`);
      }
      setModal({ type: 'none' });
      if (selectedTeam) await handleSelectTeam(selectedTeam.id);
    } catch (err: any) {
      addToast('error', `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlayer(id: string) {
    setSaving(true);
    try {
      await removePlayer(id);
      addToast('success', 'Jugador eliminado');
      setModal({ type: 'none' });
      if (selectedTeam) await handleSelectTeam(selectedTeam.id);
    } catch (err: any) {
      addToast('error', `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ─── Open Modals ──────────────────────────

  function openAddTeam() {
    setTeamForm({ name: '', short_name: '', league: 'Torneo Local', color: '#d72a22' });
    setModal({ type: 'addTeam' });
  }

  function openEditTeam(team: Team) {
    setTeamForm({ name: team.name, short_name: team.short_name, league: team.league, color: team.color, logo_url: team.logo_url || '' });
    setModal({ type: 'editTeam', team });
  }

  function openAddPlayer() {
    if (!selectedTeam) return;
    setPlayerForm({ team_id: selectedTeam.id, name: '', age_str: '', is_captain: false });
    setModal({ type: 'addPlayer', teamId: selectedTeam.id });
  }

  function openEditPlayer(player: Player) {
    setPlayerForm({
      team_id: player.team_id,
      name: player.name,
      age_str: player.age ? String(player.age) : '',
      photo_url: player.photo_url || '',
      is_captain: player.is_captain,
    });
    setModal({ type: 'editPlayer', player });
  }

  // ─── Render ───────────────────────────────

  return (
    <main className="pt-4 pb-24 px-4 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-[#f0d9a8] hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-white font-black text-xl uppercase tracking-tighter italic">Admin — Equipos</h1>
            <p className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest">
              {teams.length} equipos registrados • Supabase 🟢
            </p>
          </div>
        </div>
        <button
          onClick={openAddTeam}
          className="bg-[#e5b85c] text-[#2a1c00] px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow-[0_4px_12px_rgba(0,230,1,0.25)]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nuevo Equipo
        </button>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Teams List */}
        <div className="flex-1 space-y-2">
          <p className="text-[9px] font-black text-[#c2b391] uppercase tracking-[0.2em] px-1">Equipos del Torneo</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner" />
            </div>
          ) : teams.length === 0 ? (
            <div className="bg-[#1c1610] rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-[#4a3f2c] mb-3 block">groups</span>
              <p className="text-[#c2b391] text-sm font-bold mb-1">Sin equipos registrados</p>
              <p className="text-[#c2b391] text-[10px]">Crea el primer equipo con el botón de arriba</p>
            </div>
          ) : (
            <div className="bg-[#140f0a] rounded-xl overflow-hidden">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className={`w-full flex items-center justify-between p-4 border-b border-[#4a3f2c]/10 last:border-0 hover:bg-[#1c1610] transition-colors active:bg-[#2e2418] text-left ${
                    selectedTeam?.id === team.id ? 'bg-[#1c1610] border-l-4 border-l-[#e5b85c]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                      style={{ backgroundColor: team.color || '#d72a22' }}
                    >
                      {team.short_name}
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{team.name}</p>
                      <p className="text-[#c2b391] text-[10px] font-medium">{team.league}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditTeam(team); }}
                      className="text-[#f0d9a8] hover:text-white p-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'confirmDelete', entityType: 'team', id: team.id, name: team.name }); }}
                      className="text-[#ffb4ab] hover:text-[#ff5722] p-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <span className="material-symbols-outlined text-[#4a3f2c] text-sm">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Detail / Roster */}
        <div className="flex-1 space-y-3">
          {selectedTeam ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg"
                    style={{ backgroundColor: selectedTeam.color || '#d72a22' }}
                  >
                    {selectedTeam.short_name}
                  </div>
                  <div>
                    <h2 className="text-white font-black text-base">{selectedTeam.name}</h2>
                    <p className="text-[#c2b391] text-[10px]">{selectedTeam.players.length} jugadores</p>
                  </div>
                </div>
                <button
                  onClick={openAddPlayer}
                  className="bg-[#d72a22] text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Agregar
                </button>
              </div>

              {selectedTeam.players.length === 0 ? (
                <div className="bg-[#1c1610] rounded-xl p-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-[#4a3f2c] mb-2 block">person_off</span>
                  <p className="text-[#c2b391] text-sm">Sin jugadores en la nómina</p>
                </div>
              ) : (
                <div className="bg-[#140f0a] rounded-xl overflow-hidden">
                  {selectedTeam.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3.5 border-b border-[#4a3f2c]/10 last:border-0 hover:bg-[#1c1610] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2e2418] flex items-center justify-center flex-shrink-0">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[#c2b391]">person</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-white text-sm font-bold">{player.name}</p>
                            {player.is_captain && (
                              <span className="bg-[#ffd700]/20 text-[#ffd700] text-[8px] font-black px-1.5 py-0.5 rounded uppercase">C</span>
                            )}
                          </div>
                          <p className="text-[#c2b391] text-[10px]">
                            {player.age ? `${player.age} años` : 'Sin edad'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditPlayer(player)}
                          className="text-[#f0d9a8] hover:text-white p-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => setModal({ type: 'confirmDelete', entityType: 'player', id: player.id, name: player.name })}
                          className="text-[#ffb4ab] hover:text-[#ff5722] p-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#1c1610] rounded-xl p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-[#4a3f2c] mb-3 block">touch_app</span>
              <p className="text-[#c2b391] text-sm font-bold">Selecciona un equipo</p>
              <p className="text-[#c2b391] text-[10px] mt-1">Haz clic en un equipo para ver su nómina</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Add/Edit Team Modal */}
      {(modal.type === 'addTeam' || modal.type === 'editTeam') && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={() => setModal({ type: 'none' })} />
          <div className="fixed inset-x-0 bottom-0 z-[95]">
            <div className="bg-[#140f0a] rounded-t-2xl shadow-2xl border-t border-[#2e2418]">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-[#4a3f2c] rounded-full" /></div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-black text-lg uppercase tracking-tight">
                    {modal.type === 'addTeam' ? 'Nuevo Equipo' : 'Editar Equipo'}
                  </h3>
                  <button onClick={() => setModal({ type: 'none' })} className="text-[#b8a98a] hover:text-white p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">Nombre del Equipo *</label>
                    <input
                      className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white font-bold focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                      placeholder="Ej: Los Troncos FC"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">Abreviatura *</label>
                      <input
                        className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white font-bold focus:ring-1 focus:ring-[#d72a22]/40 outline-none uppercase"
                        placeholder="Ej: LT"
                        maxLength={3}
                        value={teamForm.short_name}
                        onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="w-12 h-12 rounded-lg border-0 cursor-pointer bg-transparent"
                          value={teamForm.color || '#d72a22'}
                          onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                        />
                        <input
                          className="flex-1 bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white font-mono text-sm focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                          value={teamForm.color}
                          onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">Liga</label>
                    <select
                      className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white font-bold focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                      value={teamForm.league}
                      onChange={(e) => setTeamForm({ ...teamForm, league: e.target.value })}
                    >
                      <option value="Torneo Local">Torneo Local</option>
                      <option value="Kings League">Kings League</option>
                      <option value="Liga Barrial">Liga Barrial</option>
                      <option value="Copa Empresarial">Copa Empresarial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">URL del Escudo (opcional)</label>
                    <input
                      className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white text-sm focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                      placeholder="https://..."
                      value={teamForm.logo_url || ''}
                      onChange={(e) => setTeamForm({ ...teamForm, logo_url: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveTeam}
                  disabled={saving}
                  className="w-full bg-[#e5b85c] text-[#2a1c00] py-3.5 rounded-xl font-black text-sm uppercase tracking-widest active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : modal.type === 'addTeam' ? 'Crear Equipo' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Player Modal */}
      {(modal.type === 'addPlayer' || modal.type === 'editPlayer') && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={() => setModal({ type: 'none' })} />
          <div className="fixed inset-x-0 bottom-0 z-[95]">
            <div className="bg-[#140f0a] rounded-t-2xl shadow-2xl border-t border-[#2e2418]">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-[#4a3f2c] rounded-full" /></div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-black text-lg uppercase tracking-tight">
                    {modal.type === 'addPlayer' ? 'Agregar Jugador' : 'Editar Jugador'}
                  </h3>
                  <button onClick={() => setModal({ type: 'none' })} className="text-[#b8a98a] hover:text-white p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">Nombre Completo *</label>
                    <input
                      className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white font-bold focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                      placeholder="Ej: Juan Pérez"
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">Edad</label>
                      <input
                        className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white font-bold focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                        placeholder="Ej: 25"
                        type="number"
                        min="15"
                        max="60"
                        value={playerForm.age_str}
                        onChange={(e) => setPlayerForm({ ...playerForm, age_str: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded bg-[#1c1610] border-[#4a3f2c] text-[#e5b85c] focus:ring-[#e5b85c]/40 cursor-pointer"
                          checked={playerForm.is_captain || false}
                          onChange={(e) => setPlayerForm({ ...playerForm, is_captain: e.target.checked })}
                        />
                        <span className="text-[#c2b391] text-xs font-bold">Capitán</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#c2b391] text-[10px] font-bold uppercase tracking-widest block mb-1">URL de Foto (opcional)</label>
                    <input
                      className="w-full bg-[#1c1610] border border-[#4a3f2c]/30 rounded-xl py-3 px-4 text-white text-sm focus:ring-1 focus:ring-[#d72a22]/40 outline-none"
                      placeholder="https://..."
                      value={playerForm.photo_url || ''}
                      onChange={(e) => setPlayerForm({ ...playerForm, photo_url: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePlayer}
                  disabled={saving}
                  className="w-full bg-[#d72a22] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : modal.type === 'addPlayer' ? 'Agregar Jugador' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete Modal */}
      {modal.type === 'confirmDelete' && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={() => setModal({ type: 'none' })} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[95] max-w-sm mx-auto">
            <div className="bg-[#1c1610] rounded-2xl p-6 shadow-2xl border border-[#2e2418] text-center space-y-4">
              <div className="w-16 h-16 bg-[#ffb4ab]/10 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[#ffb4ab] text-3xl">warning</span>
              </div>
              <h3 className="text-white font-black text-lg">¿Eliminar {modal.entityType === 'team' ? 'equipo' : 'jugador'}?</h3>
              <p className="text-[#c2b391] text-sm">
                <span className="text-white font-bold">{modal.name}</span> será eliminado permanentemente.
                {modal.entityType === 'team' && ' Todos los jugadores del equipo también se eliminarán.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setModal({ type: 'none' })}
                  className="flex-1 bg-[#2e2418] text-[#c2b391] py-3 rounded-xl font-bold text-sm active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (modal.entityType === 'team') handleDeleteTeam(modal.id);
                    else handleDeletePlayer(modal.id);
                  }}
                  disabled={saving}
                  className="flex-1 bg-[#ff5722] text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
