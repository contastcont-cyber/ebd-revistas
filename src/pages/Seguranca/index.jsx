import { useState } from 'react'
import Usuarios from './Usuarios'
import Perfis from './Perfis'
import LogAcessos from './LogAcessos'

const ABAS = [
  { key: 'usuarios', label: 'Usuários' },
  { key: 'perfis', label: 'Perfis de Acesso' },
  { key: 'log', label: 'Log de Acessos' },
]

export default function Seguranca() {
  const [aba, setAba] = useState('usuarios')

  return (
    <div>
      <div style={styles.abas}>
        {ABAS.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            style={aba === a.key ? { ...styles.aba, ...styles.abaAtiva } : styles.aba}
          >
            {a.label}
          </button>
        ))}
      </div>
      {aba === 'usuarios' && <Usuarios />}
      {aba === 'perfis' && <Perfis />}
      {aba === 'log' && <LogAcessos />}
    </div>
  )
}

const styles = {
  abas: {
    display: 'flex',
    gap: '4px',
    padding: '16px 28px 0',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#fff',
  },
  aba: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
    borderBottom: '3px solid transparent',
    marginBottom: '-2px',
  },
  abaAtiva: {
    color: '#1a3a5c',
    fontWeight: '700',
    borderBottom: '3px solid #1a3a5c',
  },
}
