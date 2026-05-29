import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function LogAcessos() {
  const [logs, setLogs] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('log_acessos')
      .select('*, usuarios(nome)')
      .order('criado_em', { ascending: false })
      .limit(200)
    setLogs(data || [])
    setCarregando(false)
  }

  function formatarData(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>Log de Acessos</h2>
      <p style={styles.desc}>Registro das últimas 200 ações realizadas no sistema.</p>

      <div style={styles.tabela}>
        <div style={styles.tabelaHeader}>
          <span style={{ flex: 1 }}>Data/Hora</span>
          <span style={{ flex: 1 }}>Usuário</span>
          <span style={{ flex: 1 }}>Módulo</span>
          <span style={{ flex: 3 }}>Ação</span>
        </div>
        {carregando && <div style={styles.vazio}>Carregando...</div>}
        {!carregando && logs.length === 0 && (
          <div style={styles.vazio}>Nenhum registro de acesso ainda.</div>
        )}
        {logs.map(l => (
          <div key={l.id} style={styles.tabelaLinha}>
            <span style={{ flex: 1, fontSize: '13px', color: '#666' }}>{formatarData(l.criado_em)}</span>
            <span style={{ flex: 1, fontSize: '13px' }}>{l.usuarios?.nome || '—'}</span>
            <span style={{ flex: 1 }}>
              {l.modulo && <span style={styles.badge}>{l.modulo}</span>}
            </span>
            <span style={{ flex: 3, fontSize: '13px', color: '#444' }}>{l.acao}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', marginBottom: '6px' },
  desc: { fontSize: '13px', color: '#666', marginBottom: '20px' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase' },
  tabelaLinha: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center' },
  badge: { backgroundColor: '#e0f0ff', color: '#1a3a5c', fontSize: '12px', padding: '3px 10px', borderRadius: '20px' },
  vazio: { padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' },
}
