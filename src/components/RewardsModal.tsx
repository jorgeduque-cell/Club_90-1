// ============================================
// CLUB 90 — Recompensas Semanales Modal
// ============================================
// §4 Mini-Recompensas: Premios relámpago por 
// fin de semana para retener usuarios.

import { useAppStore } from '../stores/appStore';

const WEEKLY_REWARDS = [
  {
    id: 'rew-1',
    title: '🍺 Petaco de Cerveza',
    description: 'El que haga más puntos SOLO ESTE DOMINGO gana un petaco de cerveza en la cancha.',
    requirement: 'Máximo puntaje del domingo',
    status: 'active' as const,
    icon: 'sports_bar',
    expiry: 'Domingo 6:00 PM',
  },
  {
    id: 'rew-2',
    title: '🪙 500 CL COINS Gratis',
    description: 'Acierta 3 predicciones seguidas este fin de semana y gana 500 CL COINS bonus.',
    requirement: 'Racha de 3 aciertos',
    status: 'active' as const,
    icon: 'verified',
    expiry: 'Domingo 11:59 PM',
  },
  {
    id: 'rew-3',
    title: '🎯 Doble Puntaje',
    description: 'Pronostica en los 3 partidos del sábado y gana doble puntaje en el ranking.',
    requirement: 'Pronosticar en 3 partidos del sábado',
    status: 'active' as const,
    icon: 'bolt',
    expiry: 'Sábado 11:59 PM',
  },
  {
    id: 'rew-4',
    title: '🏆 Entrada VIP Próxima Jornada',
    description: 'Los Top 5 del ranking semanal obtienen acceso a la zona VIP de la próxima jornada.',
    requirement: 'Top 5 ranking semanal',
    status: 'upcoming' as const,
    icon: 'workspace_premium',
    expiry: 'Próxima semana',
  },
];

export default function RewardsModal() {
  const isOpen = useAppStore((s) => s.rewardsModalOpen);
  const closeModal = useAppStore((s) => s.closeRewardsModal);
  const addToast = useAppStore((s) => s.addToast);

  if (!isOpen) return null;

  function handleClaim(title: string) {
    addToast('info', `Cumple el requisito para reclamar: ${title}`);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={closeModal} />
      <div className="fixed inset-x-0 bottom-0 z-[95] max-h-[85vh] overflow-y-auto">
        <div className="bg-[#0f212e] rounded-t-2xl shadow-2xl border-t border-[#253744]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#414753] rounded-full" />
          </div>
          <div className="p-5 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight">🎁 Recompensas Semanales</h3>
                <p className="text-[#c1c6d5] text-[10px] font-bold uppercase tracking-widest">
                  Premios relámpago • Esta semana
                </p>
              </div>
              <button onClick={closeModal} className="text-[#b1bad3] hover:text-white p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Info Banner */}
            <div className="bg-[#1a2c39] rounded-xl p-4 border-l-4 border-[#00e601]">
              <p className="text-[#d2e5f7] text-xs font-bold leading-relaxed">
                ¡No importa cómo vayas en la general! Gana premios reales cada fin de semana cumpliendo los retos.
              </p>
            </div>

            {/* Rewards */}
            <div className="space-y-3">
              {WEEKLY_REWARDS.map((reward) => (
                <div
                  key={reward.id}
                  className={`bg-[#1a2c39] rounded-xl p-4 transition-all ${
                    reward.status === 'upcoming' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center ${
                        reward.status === 'active' ? 'bg-[#00e601]/10 text-[#00e601]' : 'bg-[#253744] text-[#c1c6d5]'
                      }`}>
                        <span className="material-symbols-outlined">{reward.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-sm">{reward.title}</h4>
                        <p className="text-[#c1c6d5] text-[10px] mt-1 leading-relaxed">{reward.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[#aac7ff] text-[9px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">flag</span>
                            {reward.requirement}
                          </span>
                          <span className="text-[#c1c6d5] text-[9px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">schedule</span>
                            {reward.expiry}
                          </span>
                        </div>
                      </div>
                    </div>
                    {reward.status === 'active' && (
                      <button
                        onClick={() => handleClaim(reward.title)}
                        className="bg-[#253744] text-[#aac7ff] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#2f4553] active:scale-95 flex-shrink-0"
                      >
                        Reclamar
                      </button>
                    )}
                    {reward.status === 'upcoming' && (
                      <span className="text-[9px] font-bold text-[#c1c6d5] bg-[#253744] px-2 py-1 rounded uppercase flex-shrink-0">
                        Próximo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
