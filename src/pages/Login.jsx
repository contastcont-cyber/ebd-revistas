import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha incorretos.')
    }

    setCarregando(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.titulo}>EBD Revistas</h1>
          <p style={styles.subtitulo}>Departamento de Missões</p>
          <p style={styles.subtitulo2}>Assembleia de Deus Campinas</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.campo}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          {erro && <p style={styles.erro}>{erro}</p>}

          <button
            type="submit"
            style={carregando ? { ...styles.botao, ...styles.botaoDesabilitado } : styles.botao}
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  titulo: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a3a5c',
    margin: '0 0 4px 0',
  },
  subtitulo: {
    fontSize: '14px',
    color: '#4a6fa5',
    margin: '2px 0',
  },
  subtitulo2: {
    fontSize: '13px',
    color: '#888',
    margin: '2px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  campo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  botao: {
    padding: '13px',
    backgroundColor: '#1a3a5c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  botaoDesabilitado: {
    backgroundColor: '#7a9cc5',
    cursor: 'not-allowed',
  },
  erro: {
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'center',
    margin: '0',
  },
}
