import { supabase } from '../lib/supabase'

export default function Dashboard({ usuario }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.titulo}>EBD Revistas</h1>
          <p style={styles.subtitulo}>Departamento de Missões — Assembleia de Deus Campinas</p>
        </div>
        <div style={styles.usuario}>
          <span style={styles.nomeUsuario}>{usuario?.email}</span>
          <button onClick={handleLogout} style={styles.botaoSair}>Sair</button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.bemVindo}>Sistema em construção</h2>
        <p style={styles.texto}>
          Login funcionando com sucesso! Os módulos serão adicionados aqui em breve.
        </p>
      </main>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    backgroundColor: '#1a3a5c',
    color: '#fff',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
  },
  subtitulo: {
    margin: '2px 0 0 0',
    fontSize: '13px',
    opacity: 0.8,
  },
  usuario: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  nomeUsuario: {
    fontSize: '14px',
    opacity: 0.9,
  },
  botaoSair: {
    padding: '7px 16px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.5)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    padding: '48px 32px',
    textAlign: 'center',
  },
  bemVindo: {
    color: '#1a3a5c',
    fontSize: '24px',
  },
  texto: {
    color: '#666',
    fontSize: '16px',
  },
}
