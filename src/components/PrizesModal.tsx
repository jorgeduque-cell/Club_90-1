// ============================================
// CLUB 90 — Premios Modal
// ============================================
// §3 §4: Todos los premios del torneo
// (temporada + semanales)

import { useAppStore } from '../stores/appStore';

const SEASON_PRIZES = [
  {
    rank: '🥇 1er Lugar',
    prize: 'Televisor 55" Smart TV',
    value: '$2.500.000 COP',
    color: '#FFD700',
    icon: 'tv',
  },
  {
    rank: '🥈 2do Lugar',
    prize: 'Bicicleta GW Montaña',
    value: '$1.200.000 COP',
    color: '#C0C0C0',
    icon: 'pedal_bike',
  },
  {
    rank: '🥉 3er Lugar',
    prize: 'Audífonos Sony WH-1000XM5',
    value: '$800.000 COP',
    color: '#CD7F32',
    icon: 'headphones',
  },
];

const WEEKLY_PRIZES = [
  {
    title: 'MVP del Domingo',
    prize: 'Petaco de Cerveza + $50.000 COP',
    description: 'El jugador que haga más puntos en la jornada del domingo.',
    icon: 'sports_bar',
    color: '#ffc107',
  },
  {
    title: 'Racha Perfecta',
    prize: '1.000 🪙 CL COINS',
    description: 'Acierta todas las predicciones de una jornada completa.',
    icon: 'whatshot',
    color: '#ff5722',
  },
  {
    title: 'Pronóstico de la Semana',
    prize: 'Camiseta Oficial del Torneo',
    description: 'El pronóstico con mayor multiplicador acertado de la semana.',
    icon: 'military_tech',
    color: '#9c27b0',
  },
  {
    title: 'Recluta Estrella',
    prize: '500 🪙 CL COINS',
    description: 'Invita a un amigo que se inscriba y ambos ganan bonus.',
    icon: 'group_add',
    color: '#00bcd4',
  },
];

export default function PrizesModal() {
  const isOpen = useAppStore((s) => s.prizesModalOpen);
  const closeModal = useAppStore((s) => s.closePrizesModal);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={closeModal} />
      <div className="fixed inset-x-0 bottom-0 z-[95] max-h-[85vh] overflow-y-auto">
        <div className="bg-[#0f212e] rounded-t-2xl shadow-2xl border-t border-[#253744]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#414753] rounded-full" />
          </div>
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight">🏆 Premios del Torneo</h3>
                <p className="text-[#c1c6d5] text-[10px] font-bold uppercase tracking-widest">
                  Temporada 1 — Marzo a Junio 2026
                </p>
              </div>
              <button onClick={closeModal} className="text-[#b1bad3] hover:text-white p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Season Grand Prizes */}
            <div>
              <h4 className="text-[#aac7ff] text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-1">
                Premios de Final de Temporada (Top 3 Ranking)
              </h4>
              <div className="space-y-3">
                {SEASON_PRIZES.map((prize) => (
                  <div
                    key={prize.rank}
                    className="bg-[#1a2c39] rounded-xl p-4 flex items-center gap-4 border-l-4"
                    style={{ borderColor: prize.color }}
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${prize.color}15` }}
                    >
                      <span className="material-symbols-outlined text-2xl" style={{ color: prize.color }}>
                        {prize.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-black text-sm">{prize.rank}</p>
                      <p className="text-[#d2e5f7] font-bold text-xs mt-0.5">{prize.prize}</p>
                      <p className="text-[#00e601] font-black text-[10px] mt-1">Valor: {prize.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Prizes */}
            <div>
              <h4 className="text-[#aac7ff] text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-1">
                Premios Semanales (Cada Jornada)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {WEEKLY_PRIZES.map((prize) => (
                  <div key={prize.title} className="bg-[#1a2c39] rounded-xl p-3.5">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${prize.color}15` }}
                    >
                      <span className="material-symbols-outlined text-lg" style={{ color: prize.color }}>
                        {prize.icon}
                      </span>
                    </div>
                    <h5 className="text-white font-bold text-[11px] mb-0.5">{prize.title}</h5>
                    <p className="text-[#00e601] font-black text-[10px] mb-1">{prize.prize}</p>
                    <p className="text-[#c1c6d5] text-[9px] leading-relaxed">{prize.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Note */}
            <div className="bg-[#1a2c39] rounded-lg p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-[#c1c6d5] text-sm mt-0.5">info</span>
              <p className="text-[#c1c6d5] text-[9px] leading-relaxed">
                Los premios son financiados con las inscripciones al torneo. Las 🪙 CL COINS son moneda virtual
                no canjeable por dinero real. Club 90 opera como un Juego de Fantasía de destreza.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
