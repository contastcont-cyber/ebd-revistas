import { supabase } from '../lib/supabase'

const MODULOS = [
  { key: 'cadastros', label: 'Igrejas / Revistas' },
  { key: 'trimestres', label: 'Trimestres' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'entregas', label: 'Entregas' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'carne', label: 'Carnê' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'seguranca', label: 'Segurança' },
]

export default function Navbar({ usuario, modulosLiberados, paginaAtual, setPagina }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const modulosVisiveis = MODULOS.filter(m => modulosLiberados.includes(m.key))

  return (
    <header style={styles.header}>
      <div style={styles.top}>
        <div>
          <h1 style={styles.titulo}>EBD Revistas</h1>
          <p style={styles.subtitulo}>Departamento de Missões — Assembleia de Deus Campinas</p>
        </div>
        <div style={styles.usuarioArea}>
          <span style={styles.nomeUsuario}>{usuario?.nome || usuario?.email}</span>
          <button onClick={handleLogout} style={styles.botaoSair}>Sair</button>
        </div>
      </div>
      <nav style={styles.nav}>
        <button
          onClick={() => setPagina('dashboard')}
          style={paginaAtual === 'dashboard' ? { ...styles.navItem, ...styles.navItemAtivo } : styles.navItem}
        >
          Início
        </button>
        {modulosVisiveis.map(m => (
          <button
            key={m.key}
            onClick={() => setPagina(m.key)}
            style={paginaAtual === m.key ? { ...styles.navItem, ...styles.navItemAtivo } : styles.navItem}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

const styles = {
  header: {
    backgroundColor: '#1a3a5c',
    color: '#fff',
  },
  top: {
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  subtitulo: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    opacity: 0.75,
  },
  usuarioArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  nomeUsuario: {
    fontSize: '14px',
    opacity: 0.9,
  },
  botaoSair: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  nav: {
    display: 'flex',
    gap: '2px',
    padding: '0 24px',
    backgroundColor: '#152e4a',
    overflowX: 'auto',
  },
  navItem: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.75)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    borderBottom: '3px solid transparent',
  },
  navItemAtivo: {
    color: '#ffffff',
    borderBottom: '3px solid #4a9fd4',
    fontWeight: '600',
  },
}
