import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [perfis, setPerfis] = useState([])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil_id: '', ativo: true })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [{ data: u }, { data: p }] = await Promise.all([
      supabase.from('usuarios').select('*, perfis(nome)').order('nome'),
      supabase.from('perfis').select('*').order('nome'),
    ])
    setUsuarios(u || [])
    setPerfis(p || [])
  }

  function abrirNovo() {
    setForm({ nome: '', email: '', senha: '', perfil_id: perfis[0]?.id || '', ativo: true })
    setEditando('novo')
    setErro('')
  }

  function abrirEditar(u) {
    setForm({ nome: u.nome, email: u.email, senha: '', perfil_id: u.perfil_id, ativo: u.ativo })
    setEditando(u.id)
    setErro('')
  }

  async function salvar() {
    if (!form.nome.trim() || !form.email.trim()) return
    setSalvando(true)
    setErro('')

    if (editando === 'novo') {
      if (!form.senha.trim()) {
        setErro('Informe uma senha para o novo usuário.')
        setSalvando(false)
        return
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
      })
      if (authError) {
        setErro('Erro ao criar usuário: ' + authError.message)
        setSalvando(false)
        return
      }
      await supabase.from('usuarios').insert({
        id: authData.user.id,
        nome: form.nome,
        email: form.email,
        perfil_id: form.perfil_id,
        ativo: form.ativo,
      })
    } else {
      await supabase.from('usuarios').update({
        nome: form.nome,
        perfil_id: form.perfil_id,
        ativo: form.ativo,
      }).eq('id', editando)
    }

    setSalvando(false)
    setEditando(null)
    setMensagem(editando === 'novo' ? 'Usuário criado com sucesso!' : 'Usuário atualizado!')
    setTimeout(() => setMensagem(''), 3000)
    carregar()
  }

  return (
    <div style={styles.container}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Usuários do Sistema</h2>
        <button onClick={abrirNovo} style={styles.botaoNovo}>+ Novo Usuário</button>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {editando && (
        <div style={styles.formulario}>
          <h3 style={styles.formTitulo}>{editando === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}</h3>

          <div style={styles.grid2}>
            <div style={styles.campo}>
              <label style={styles.label}>Nome completo</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={styles.input} placeholder="Nome do usuário" />
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>E-mail</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ ...styles.input, backgroundColor: editando !== 'novo' ? '#f3f4f6' : '#fff' }} placeholder="email@exemplo.com" disabled={editando !== 'novo'} />
            </div>
          </div>

          {editando === 'novo' && (
            <div style={styles.campo}>
              <label style={styles.label}>Senha inicial</label>
              <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} style={styles.input} placeholder="Mínimo 6 caracteres" />
            </div>
          )}

          <div style={styles.grid2}>
            <div style={styles.campo}>
              <label style={styles.label}>Perfil de acesso</label>
              <select value={form.perfil_id} onChange={e => setForm(f => ({ ...f, perfil_id: e.target.value }))} style={styles.select}>
                {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Status</label>
              <select value={form.ativo ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'true' }))} style={styles.select}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          {erro && <p style={styles.erro}>{erro}</p>}

          <div style={styles.botoesForm}>
            <button onClick={() => setEditando(null)} style={styles.botaoCancelar}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={styles.botaoSalvar}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.tabela}>
        <div style={styles.tabelaHeader}>
          <span style={{ flex: 2 }}>Nome</span>
          <span style={{ flex: 2 }}>E-mail</span>
          <span style={{ flex: 1 }}>Perfil</span>
          <span style={{ flex: 1 }}>Status</span>
          <span style={{ flex: 1 }}></span>
        </div>
        {usuarios.map(u => (
          <div key={u.id} style={styles.tabelaLinha}>
            <span style={{ flex: 2 }}>{u.nome}</span>
            <span style={{ flex: 2, color: '#666', fontSize: '13px' }}>{u.email}</span>
            <span style={{ flex: 1, fontSize: '13px' }}>{u.perfis?.nome}</span>
            <span style={{ flex: 1 }}>
              <span style={u.ativo ? styles.badgeAtivo : styles.badgeInativo}>
                {u.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </span>
            <span style={{ flex: 1, textAlign: 'right' }}>
              <button onClick={() => abrirEditar(u)} style={styles.botaoEditar}>Editar</button>
            </span>
          </div>
        ))}
        {usuarios.length === 0 && (
          <div style={styles.vazio}>Nenhum usuário cadastrado ainda.</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: 0 },
  botaoNovo: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  formulario: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitulo: { fontSize: '17px', color: '#1a3a5c', marginBottom: '20px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  campo: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  erro: { color: '#dc2626', fontSize: '13px', marginBottom: '12px' },
  botoesForm: { display: 'flex', gap: '10px', marginTop: '8px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '9px 24px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase' },
  tabelaLinha: { display: 'flex', padding: '14px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px' },
  badgeAtivo: { backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  badgeInativo: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  botaoEditar: { padding: '6px 14px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  vazio: { padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' },
}
