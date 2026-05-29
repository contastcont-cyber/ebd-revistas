import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Navbar from './components/Navbar'
import Seguranca from './pages/Seguranca'
import Cadastros from './pages/Cadastros'
import Trimestres from './pages/Trimestres'
import Pedidos from './pages/Pedidos'

export default function App() {
  const [sessao, setSessao] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
      if (session) carregarUsuario(session.user.id)
      else setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
      if (session) carregarUsuario(session.user.id)
      else { setUsuario(null); setCarregando(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function carregarUsuario(id) {
    const { data } = await supabase
      .from('usuarios')
      .select('*, perfis(nome, modulos_liberados)')
      .eq('id', id)
      .single()
    setUsuario(data)
    setCarregando(false)
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
        <p style={{ color: '#666' }}>Carregando...</p>
      </div>
    )
  }

  if (!sessao) return <Login />

  const modulosLiberados = usuario?.perfis?.modulos_liberados || []

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f8', fontFamily: 'Arial, sans-serif' }}>
      <Navbar
        usuario={usuario}
        modulosLiberados={modulosLiberados}
        paginaAtual={pagina}
        setPagina={setPagina}
      />

      <main>
        {pagina === 'dashboard' && (
          <div style={{ padding: '48px 28px', textAlign: 'center' }}>
            <h2 style={{ color: '#1a3a5c', fontSize: '24px', marginBottom: '8px' }}>
              Bem-vindo, {usuario?.nome || sessao.user.email}!
            </h2>
            <p style={{ color: '#666' }}>Use o menu acima para navegar pelo sistema.</p>
          </div>
        )}
        {pagina === 'seguranca' && modulosLiberados.includes('seguranca') && <Seguranca />}
        {pagina === 'cadastros' && modulosLiberados.includes('cadastros') && <Cadastros />}
        {pagina === 'trimestres' && modulosLiberados.includes('trimestres') && <Trimestres />}
        {pagina === 'pedidos' && modulosLiberados.includes('pedidos') && <Pedidos />}
        {pagina !== 'dashboard' && pagina !== 'seguranca' && pagina !== 'cadastros' && pagina !== 'trimestres' && pagina !== 'pedidos' && (
          <div style={{ padding: '48px 28px', textAlign: 'center', color: '#999' }}>
            Módulo em construção — em breve disponível.
          </div>
        )}
      </main>
    </div>
  )
}
