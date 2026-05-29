import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TODOS_MODULOS = [
  { key: 'cadastros', label: 'Igrejas / Revistas' },
  { key: 'trimestres', label: 'Trimestres' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'entregas', label: 'Entregas' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'carne', label: 'Carnê' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'seguranca', label: 'Segurança (Admin)' },
]

export default function Perfis() {
  const [perfis, setPerfis] = useState([])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', descricao: '', modulos_liberados: [] })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('perfis').select('*').order('nome')
    setPerfis(data || [])
  }

  function abrirNovo() {
    setForm({ nome: '', descricao: '', modulos_liberados: [] })
    setEditando('novo')
  }

  function abrirEditar(p) {
    setForm({ nome: p.nome, descricao: p.descricao || '', modulos_liberados: p.modulos_liberados || [] })
    setEditando(p.id)
  }

  function toggleModulo(key) {
    setForm(f => ({
      ...f,
      modulos_liberados: f.modulos_liberados.includes(key)
        ? f.modulos_liberados.filter(m => m !== key)
        : [...f.modulos_liberados, key]
    }))
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    if (editando === 'novo') {
      await supabase.from('perfis').insert(form)
    } else {
      await supabase.from('perfis').update(form).eq('id', editando)
    }
    setSalvando(false)
    setEditando(null)
    setMensagem('Perfil salvo com sucesso!')
    setTimeout(() => setMensagem(''), 3000)
    carregar()
  }

  return (
    <div style={styles.container}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Perfis de Acesso</h2>
        <button onClick={abrirNovo} style={styles.botaoNovo}>+ Novo Perfil</button>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {editando && (
        <div style={styles.formulario}>
          <h3 style={styles.formTitulo}>{editando === 'novo' ? 'Novo Perfil' : 'Editar Perfil'}</h3>
          <div style={styles.campo}>
            <label style={styles.label}>Nome do perfil</label>
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              style={styles.input}
              placeholder="Ex: Atendente"
            />
          </div>
          <div style={styles.campo}>
            <label style={styles.label}>Descrição</label>
            <input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              style={styles.input}
              placeholder="O que esse perfil pode fazer"
            />
          </div>
          <div style={styles.campo}>
            <label style={styles.label}>Módulos liberados</label>
            <div style={styles.modulosGrid}>
              {TODOS_MODULOS.map(m => (
                <label key={m.key} style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={form.modulos_liberados.includes(m.key)}
                    onChange={() => toggleModulo(m.key)}
                    style={{ marginRight: '8px' }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <div style={styles.botoesForm}>
            <button onClick={() => setEditando(null)} style={styles.botaoCancelar}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={styles.botaoSalvar}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.lista}>
        {perfis.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={styles.cardInfo}>
              <strong style={styles.cardNome}>{p.nome}</strong>
              <span style={styles.cardDesc}>{p.descricao}</span>
              <div style={styles.tags}>
                {(p.modulos_liberados || []).map(m => {
                  const mod = TODOS_MODULOS.find(x => x.key === m)
                  return mod ? <span key={m} style={styles.tag}>{mod.label}</span> : null
                })}
              </div>
            </div>
            <button onClick={() => abrirEditar(p)} style={styles.botaoEditar}>Editar</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: 0 },
  botaoNovo: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  formulario: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitulo: { fontSize: '17px', color: '#1a3a5c', marginBottom: '20px' },
  campo: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', maxWidth: '480px' },
  modulosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '7px' },
  checkLabel: { display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' },
  botoesForm: { display: 'flex', gap: '10px', marginTop: '20px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '9px 24px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  lista: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#fff', borderRadius: '10px', padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  cardNome: { fontSize: '16px', color: '#1a3a5c' },
  cardDesc: { fontSize: '13px', color: '#666' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' },
  tag: { backgroundColor: '#e0f0ff', color: '#1a3a5c', fontSize: '12px', padding: '3px 10px', borderRadius: '20px' },
  botaoEditar: { padding: '7px 16px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
}
