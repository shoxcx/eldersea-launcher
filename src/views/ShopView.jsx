import React from 'react';
import { ShoppingBag, Hammer } from 'lucide-react';

const ShopView = () => {
  return (
    <div className="shop-view fade-in" style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' 
    }}>
      <div className="glass-panel" style={{ 
        padding: '60px', textAlign: 'center', maxWidth: '500px', border: '1px solid var(--border-bright)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
      }}>
        <div style={{ 
          background: 'rgba(212,175,55,0.15)', width: '80px', height: '80px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          border: '1px solid var(--purple)'
        }}>
          <Hammer size={40} color="var(--purple-light)" />
        </div>
        <h1 className="cinzel" style={{ color: 'var(--crystal)', letterSpacing: '4px', marginBottom: '16px' }}>BOUTIQUE</h1>
        <div style={{ color: 'var(--purple-light)', fontSize: '12px', letterSpacing: '2px', marginBottom: '24px' }}>EN MAINTENANCE</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
          Nos artisans préparent de nouvelles reliques et équipements pour vos futures aventures. Revenez bientôt !
        </p>
      </div>
    </div>
  );
};

export default ShopView;
