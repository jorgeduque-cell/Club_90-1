import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface StoreItem {
  id: string;
  name: string;
  costInCoins: number;
  sponsorName: string | null;
  iconUrl: string | null;
}

interface RedeemReceipt {
  code: string;
  itemName: string;
  cost: number;
  date: string;
  userName: string;
}

// ── Receipt Modal ─────────────────────────────
function ReceiptModal({ receipt, onClose }: { receipt: RedeemReceipt; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#171716', border: '1px solid rgba(215,42,34,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="text-center py-5 px-6"
          style={{ background: 'linear-gradient(135deg, #e5b85c 0%, #c79a3e 100%)' }}
        >
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: '#2a1c00' }}>
            ¡Canje Exitoso!
          </h2>
          <p className="text-xs mt-1 font-semibold" style={{ color: '#015600' }}>
            Comprobante de Canje — Club PyP
          </p>
        </div>

        {/* Receipt Body */}
        <div className="p-5 space-y-4">
          {/* Item */}
          <div className="flex justify-between items-center py-3 px-4 rounded-xl" style={{ backgroundColor: '#1f1e1c' }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a59281' }}>Producto</p>
              <p className="text-white text-sm font-bold mt-0.5">{receipt.itemName}</p>
            </div>
            <span className="text-2xl">🎁</span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="py-3 px-4 rounded-xl" style={{ backgroundColor: '#1f1e1c' }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a59281' }}>Costo</p>
              <p className="text-white text-sm font-bold mt-0.5">{receipt.cost.toLocaleString()} PyP</p>
            </div>
            <div className="py-3 px-4 rounded-xl" style={{ backgroundColor: '#1f1e1c' }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a59281' }}>Fecha</p>
              <p className="text-white text-sm font-bold mt-0.5">{receipt.date}</p>
            </div>
          </div>

          {/* Code Box */}
          <div 
            className="text-center py-4 px-4 rounded-xl"
            style={{ 
              backgroundColor: '#1f1e1c', 
              border: '2px dashed rgba(215,42,34,0.4)' 
            }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#a59281' }}>
              Código de Canje
            </p>
            <p 
              className="text-2xl font-black tracking-widest"
              style={{ color: '#e5b85c', fontFamily: 'monospace' }}
            >
              {receipt.code}
            </p>
            <p className="text-[10px] mt-2" style={{ color: '#a59281' }}>
              Muestra este código en la tienda
            </p>
          </div>

          {/* User Info */}
          <div className="text-center py-2">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#a59281' }}>
              Canjeado por
            </p>
            <p className="text-white text-sm font-semibold mt-0.5">{receipt.userName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Comprobante Club PyP',
                  text: `🎁 Canje: ${receipt.itemName}\n📋 Código: ${receipt.code}\n📅 ${receipt.date}\n👤 ${receipt.userName}`
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(
                  `Comprobante Club PyP\nProducto: ${receipt.itemName}\nCódigo: ${receipt.code}\nFecha: ${receipt.date}\nUsuario: ${receipt.userName}`
                );
              }
            }}
            className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ 
              backgroundColor: '#1f1e1c', 
              color: '#f0d9a8',
              border: '1px solid rgba(170,199,255,0.2)'
            }}
          >
            <span className="material-symbols-outlined text-base">share</span>
            Compartir Comprobante
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-95"
            style={{ 
              background: 'linear-gradient(135deg, #e5b85c 0%, #c79a3e 100%)',
              color: '#2a1c00'
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────
function ConfirmModal({ item, onConfirm, onCancel }: { item: StoreItem; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm rounded-2xl overflow-hidden p-6"
        style={{ backgroundColor: '#171716', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🎁</div>
          <h2 className="text-white text-lg font-black uppercase">Confirmar Canje</h2>
        </div>
        
        <div className="py-4 px-5 rounded-xl mb-5" style={{ backgroundColor: '#1f1e1c' }}>
          <p className="text-white font-bold text-sm">{item.name}</p>
          <p className="text-sm mt-1" style={{ color: '#e5b85c' }}>
            {item.costInCoins.toLocaleString()} PyP Coins
          </p>
        </div>

        <p className="text-center text-xs mb-5" style={{ color: '#a59281' }}>
          Esta acción descontará {item.costInCoins.toLocaleString()} PyP Coins de tu saldo.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-sm uppercase"
            style={{ backgroundColor: '#1f1e1c', color: '#c2b391' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-black text-sm uppercase active:scale-95 transition-transform"
            style={{ 
              background: 'linear-gradient(135deg, #e5b85c 0%, #c79a3e 100%)',
              color: '#2a1c00'
            }}
          >
            Canjear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Error Modal ─────────────────────────────
function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-2xl overflow-hidden p-6 text-center"
        style={{ backgroundColor: '#171716', border: '1px solid rgba(255,70,70,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">❌</div>
        <h2 className="text-white text-lg font-black uppercase mb-2">Error</h2>
        <p className="text-sm mb-5" style={{ color: '#c2b391' }}>{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-sm uppercase"
          style={{ backgroundColor: '#1f1e1c', color: '#c2b391' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════

export default function StorePage() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);
  const [receipt, setReceipt] = useState<RedeemReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.accountTier !== 'PREMIUM') {
      setLoading(false);
      return;
    }

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('store_items')
        .select('*')
        .eq('isActive', true)
        .order('costInCoins', { ascending: true });
      
      if (!error && data) {
        setItems(data.map(d => ({
          id: d.id,
          name: d.name,
          costInCoins: d.costInCoins,
          sponsorName: d.sponsorName,
          iconUrl: d.iconUrl
        })));
      }
      setLoading(false);
    };

    fetchItems();
  }, [profile]);

  const handleRedeem = async (item: StoreItem) => {
    if (!profile || profile.accountTier !== 'PREMIUM') return;
    if (profile.clCoins < item.costInCoins) {
      setErrorMsg('No tienes suficientes PyP Coins para canjear este premio.');
      return;
    }
    setConfirmItem(item);
  };

  const executeRedeem = async () => {
    if (!confirmItem || !profile) return;
    setConfirmItem(null);
    setRedeeming(confirmItem.id);
    
    try {
      const { data, error } = await supabase.rpc('redeem_store_item', {
        p_store_item_id: confirmItem.id
      });

      if (error) throw error;
      
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result || !result.success) {
        throw new Error(result?.message || 'Error desconocido del servidor');
      }
      
      const now = new Date();
      setReceipt({
        code: result.qr_code_string || `C90-${confirmItem.id.slice(0, 6).toUpperCase()}`,
        itemName: confirmItem.name,
        cost: confirmItem.costInCoins,
        date: now.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        userName: profile.name || 'Usuario'
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al canjear el premio');
    } finally {
      setRedeeming(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-4 flex justify-center items-center h-[50vh]">
        <div className="spinner__circle" />
      </div>
    );
  }

  // PAYWALL: Si es GUEST
  if (profile?.accountTier === 'GUEST') {
    return (
      <div className="p-4 text-center mt-12">
        <span className="material-symbols-outlined text-6xl text-[#ffd700] mb-4">lock</span>
        <h2 className="text-white text-2xl font-black mb-2 uppercase tracking-tight">Kiosco Bloqueado</h2>
        <p className="text-[#c2b391] text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          El Kiosco de Recompensas Físicas es un beneficio exclusivo para miembros PREMIUM.
        </p>
        <button 
          onClick={() => window.location.href = '/profile'}
          className="bg-gradient-to-r from-[#ffd700] to-[#ffa500] text-black font-black uppercase text-sm py-4 px-8 rounded-xl shadow-[0_4px_24px_rgba(255,215,0,0.3)] active:scale-95 transition-transform"
        >
          Activar Pase Premium
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 pb-24">
        <header className="mb-6">
          <h1 className="text-white text-2xl font-black uppercase tracking-tight">Kiosco VIP</h1>
          <p className="text-[#f0d9a8] text-xs">Canjea tus aciertos por recompensas reales</p>
        </header>

        {items.length === 0 ? (
          <div className="bg-[#1f1e1c] rounded-xl p-6 text-center text-[#c2b391] mt-8">
            Aún no hay recompensas físicas activas en este momento. Vuelve más tarde.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-[#1f1e1c] rounded-xl p-4 flex flex-col relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
                {item.sponsorName && (
                  <div className="absolute top-0 right-0 bg-[#d72a22] text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    {item.sponsorName}
                  </div>
                )}
                
                <div className="w-full aspect-square bg-[#171716] rounded-lg mb-3 flex items-center justify-center text-4xl">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    '🎁'
                  )}
                </div>
                
                <h3 className="text-white text-xs font-bold leading-tight mb-2 flex-grow">{item.name}</h3>
                
                <button 
                  onClick={() => handleRedeem(item)}
                  disabled={redeeming === item.id || (profile?.clCoins ?? 0) < item.costInCoins}
                  className={`w-full py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                    (profile?.clCoins ?? 0) >= item.costInCoins
                      ? 'bg-[#d72a22] text-white active:scale-95'
                      : 'bg-[#2a3c49] text-[#7d776e] opacity-70'
                  }`}
                >
                  {redeeming === item.id ? (
                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  ) : (
                    <>
                      <span>{item.costInCoins.toLocaleString()}</span>
                      <span className="material-symbols-outlined text-xs">monetization_on</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmItem && (
        <ConfirmModal 
          item={confirmItem} 
          onConfirm={executeRedeem} 
          onCancel={() => setConfirmItem(null)} 
        />
      )}
      {receipt && (
        <ReceiptModal 
          receipt={receipt} 
          onClose={() => { setReceipt(null); window.location.reload(); }} 
        />
      )}
      {errorMsg && (
        <ErrorModal 
          message={errorMsg} 
          onClose={() => setErrorMsg(null)} 
        />
      )}
    </>
  );
}
