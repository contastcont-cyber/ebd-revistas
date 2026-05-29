import { useState } from 'react'
import FinanceiroIgrejas from './Igrejas'

const ABAS = [
  { key: 'igrejas', label: 'Igrejas' },
  { key: 'editora', label: 'Editora' },
]

export default function Financeiro() {
  const [aba, setAba] = useState('igrejas')

  return (
    <div>
      <div style={styles.abas}>
        {ABAS.map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            style={aba === a.key ? { ...styles.aba, ...styles.abaAtiva } : styles.aba}>
            {a.label}
          </button>
        ))}
      </div>
      {aba === 'igrejas' && <FinanceiroIgrejas />}
      {aba === 'editora' && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#999' }}>
          Financeiro Editora — próxima etapa.
        </div>
      )}
    </div>
  )
}

const styles = {
  abas: { display: 'flex', gap: '4px', padding: '16px 28px 0', borderBottom: '2px solid #e5e7eb', backgroundColor: '#fff' },
  aba: { padding: '10px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#666', borderBottom: '3px solid transparent', marginBottom: '-2px' },
  abaAtiva: { color: '#1a3a5c', fontWeight: '700', borderBottom: '3px solid #1a3a5c' },
}
