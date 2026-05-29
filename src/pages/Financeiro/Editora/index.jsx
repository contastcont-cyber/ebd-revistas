import { useState } from 'react'
import PedidoEditora from './PedidoEditora'
import PagamentosEditora from './PagamentosEditora'
import ConfigEditora from './ConfigEditora'

const ABAS = [
  { key: 'pedido', label: 'Pedido' },
  { key: 'pagamentos', label: 'Pagamentos' },
  { key: 'config', label: 'Configurações' },
]

export default function Editora() {
  const [aba, setAba] = useState('pedido')
  return (
    <div>
      <div style={s.abas}>
        {ABAS.map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            style={aba === a.key ? { ...s.aba, ...s.abaAtiva } : s.aba}>
            {a.label}
          </button>
        ))}
      </div>
      {aba === 'pedido' && <PedidoEditora />}
      {aba === 'pagamentos' && <PagamentosEditora />}
      {aba === 'config' && <ConfigEditora />}
    </div>
  )
}

const s = {
  abas: { display: 'flex', gap: '4px', padding: '16px 28px 0', borderBottom: '2px solid #e5e7eb', backgroundColor: '#fff' },
  aba: { padding: '10px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#666', borderBottom: '3px solid transparent', marginBottom: '-2px' },
  abaAtiva: { color: '#1a3a5c', fontWeight: '700', borderBottom: '3px solid #1a3a5c' },
}
