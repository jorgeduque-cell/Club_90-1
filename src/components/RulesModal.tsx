// ============================================
// CLUB 90 — Reglas del Juego Modal
// ============================================
// §5 §6: Explica las reglas del torneo, las
// multiplicadores fijos y los límites anti-inflación.

import { useAppStore, MAX_STAKE, MAX_MULTIPLIER_CAP } from '../stores/appStore';

export default function RulesModal() {
  const isOpen = useAppStore((s) => s.rulesModalOpen);
  const closeModal = useAppStore((s) => s.closeRulesModal);

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
                <h3 className="text-white font-black text-lg uppercase tracking-tight">📖 Reglas del Juego</h3>
                <p className="text-[#c1c6d5] text-[10px] font-bold uppercase tracking-widest">
                  Cómo funciona Club 90
                </p>
              </div>
              <button onClick={closeModal} className="text-[#b1bad3] hover:text-white p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Section 1: Qué es Club 90 */}
            <div className="bg-[#1a2c39] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00e601]">sports_soccer</span>
                <h4 className="text-white font-black text-sm uppercase">¿Qué es Club 90?</h4>
              </div>
              <p className="text-[#c1c6d5] text-xs leading-relaxed">
                Club 90 es un <span className="text-white font-bold">Juego de Fantasía</span> de economía virtual cerrada.
                Juegas con <span className="text-[#00e601] font-bold">🪙 CL COINS</span> para escalar en el ranking global
                y ganar premios reales. No se juega con dinero real.
              </p>
            </div>

            {/* Section 2: Cómo Pronosticar */}
            <div className="bg-[#1a2c39] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#aac7ff]">sports_esports</span>
                <h4 className="text-white font-black text-sm uppercase">Cómo Pronosticar</h4>
              </div>
              <div className="space-y-2">
                {[
                  { num: '1', text: 'Selecciona un partido de la lista.' },
                  { num: '2', text: 'Elige tu predicción: Gana Local (1), Empate (X) o Gana Visitante (2).' },
                  { num: '3', text: 'Ingresa el monto de 🪙 CL COINS que quieres arriesgar.' },
                  { num: '4', text: 'Tu multiplicador se congela al momento del pronóstico. Si aciertas, se te paga a ese multiplicador exacto.' },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#1475e1] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-black">{step.num}</span>
                    </div>
                    <p className="text-[#c1c6d5] text-xs leading-relaxed pt-0.5">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Límites */}
            <div className="bg-[#1a2c39] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb4ab]">gavel</span>
                <h4 className="text-white font-black text-sm uppercase">Reglas de Economía</h4>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    icon: 'block',
                    title: `Máximo por pronóstico: ${MAX_STAKE.toLocaleString()} 🪙`,
                    desc: 'No puedes arriesgar más de esta cantidad en un solo partido.',
                    color: '#ffb4ab',
                  },
                  {
                    icon: 'trending_up',
                    title: `Multiplicador máximo: ${MAX_MULTIPLIER_CAP.toFixed(2)}`,
                    desc: 'Ningún multiplicador puede superar este valor para proteger la economía.',
                    color: '#aac7ff',
                  },
                  {
                    icon: 'person',
                    title: '1 predicción por partido',
                    desc: 'No puedes predecir más de un resultado en el mismo partido.',
                    color: '#77ff61',
                  },
                  {
                    icon: 'lock_clock',
                    title: 'Cierre 15 min antes',
                    desc: 'Los pronósticos se cierran 15 minutos antes del inicio del partido.',
                    color: '#ffc107',
                  },
                ].map((rule) => (
                  <div key={rule.title} className="flex items-start gap-3 bg-[#0f212e] rounded-lg p-3">
                    <span className="material-symbols-outlined text-lg mt-0.5" style={{ color: rule.color }}>{rule.icon}</span>
                    <div>
                      <p className="text-white text-xs font-bold">{rule.title}</p>
                      <p className="text-[#c1c6d5] text-[10px] mt-0.5">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Ranking */}
            <div className="bg-[#1a2c39] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffd700]">emoji_events</span>
                <h4 className="text-white font-black text-sm uppercase">El Ranking</h4>
              </div>
              <p className="text-[#c1c6d5] text-xs leading-relaxed">
                Tu posición en el ranking se determina por la cantidad de 🪙 CL COINS que acumules.
                Cada acierto te sube, cada fallo te baja. Al final de la temporada (3 meses),
                <span className="text-[#00e601] font-bold"> los Top 3 ganan los premios mayores</span>.
              </p>
            </div>

            {/* Section 5: Recargas */}
            <div className="bg-[#1a2c39] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00e601]">add_circle</span>
                <h4 className="text-white font-black text-sm uppercase">¿Te quedaste sin 🪙?</h4>
              </div>
              <p className="text-[#c1c6d5] text-xs leading-relaxed">
                Si llegas a 0 CL COINS, puedes comprar una <span className="text-white font-bold">Vida Extra</span>: transfiere
                $20.000 COP vía Nequi y recibe 5.000 🪙 CL COINS para seguir jugando y pelear por los premios semanales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
