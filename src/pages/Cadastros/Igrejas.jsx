import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Igrejas() {
  const [igrejas, setIgrejas] = useState([])
  const [filtro, setFiltro] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ codigo: '', nome: '', responsavel: '', telefone: '', ativo: true })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('igrejas')
      .select('*')
      .order('codigo', { ascending: true })
    setIgrejas(data || [])
  }

  function abrirNovo() {
    setForm({ codigo: '', nome: '', responsavel: '', telefone: '', ativo: true })
    setEditando('novo')
    setErro('')
  }

  function abrirEditar(ig) {
    setForm({ codigo: ig.codigo, nome: ig.nome, responsavel: ig.responsavel || '', telefone: ig.telefone || '', ativo: ig.ativo })
    setEditando(ig.id)
    setErro('')
  }

  function cancelar() {
    setEditando(null)
    setErro('')
  }

  async function salvar() {
    if (!form.codigo || !form.nome.trim()) {
      setErro('Código e nome são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')

    if (editando === 'novo') {
      const { error } = await supabase.from('igrejas').insert({
        codigo: parseInt(form.codigo),
        nome: form.nome.trim(),
        responsavel: form.responsavel.trim(),
        telefone: form.telefone.trim(),
        ativo: form.ativo,
      })
      if (error) {
        setErro(error.code === '23505' ? 'Já existe uma igreja com esse código.' : 'Erro ao salvar: ' + error.message)
        setSalvando(false)
        return
      }
    } else {
      const { error } = await supabase.from('igrejas').update({
        codigo: parseInt(form.codigo),
        nome: form.nome.trim(),
        responsavel: form.responsavel.trim(),
        telefone: form.telefone.trim(),
        ativo: form.ativo,
      }).eq('id', editando)
      if (error) {
        setErro('Erro ao salvar: ' + error.message)
        setSalvando(false)
        return
      }
    }

    setSalvando(false)
    setEditando(null)
    setMensagem(editando === 'novo' ? 'Igreja cadastrada com sucesso!' : 'Igreja atualizada com sucesso!')
    setTimeout(() => setMensagem(''), 3000)
    carregar()
  }

  const igrejasFiltradas = igrejas.filter(ig => {
    const visivel = mostrarInativos ? true : ig.ativo
    if (!visivel) return false
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return (
      String(ig.codigo).includes(f) ||
      ig.nome.toLowerCase().includes(f) ||
      (ig.responsavel || '').toLowerCase().includes(f) ||
      (ig.telefone || '').includes(f)
    )
  })

  return (
    <div style={styles.container}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Cadastro de Igrejas</h2>
        <button onClick={abrirNovo} style={styles.botaoNovo}>+ Nova Igreja</button>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {/* FORMULÁRIO */}
      {editando && (
        <div style={styles.formulario}>
          <h3 style={styles.formTitulo}>{editando === 'novo' ? 'Nova Igreja' : 'Editar Igreja'}</h3>
          <div style={styles.grid2}>
            <div style={styles.campo}>
              <label style={styles.label}>Código <span style={styles.obrig}>*</span></label>
              <input
                type="number"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                style={styles.input}
                placeholder="Ex: 101"
              />
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Status</label>
              <select
                value={form.ativo ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'true' }))}
                style={styles.select}
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Nome da congregação <span style={styles.obrig}>*</span></label>
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              style={styles.inputFull}
              placeholder="Ex: Congregação Vila Nova"
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.campo}>
              <label style={styles.label}>Responsável pela retirada</label>
              <input
                value={form.responsavel}
                onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                style={styles.input}
                placeholder="Nome do responsável"
              />
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Telefone de contato</label>
              <input
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                style={styles.input}
                placeholder="(19) 99999-9999"
              />
            </div>
          </div>

          {erro && <p style={styles.erro}>{erro}</p>}

          <div style={styles.botoesForm}>
            <button onClick={cancelar} style={styles.botaoCancelar}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={styles.botaoSalvar}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div style={styles.filtros}>
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={styles.busca}
          placeholder="Buscar por código, nome, responsável ou telefone..."
        />
        <label style={styles.checkFiltro}>
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={e => setMostrarInativos(e.target.checked)}
            style={{ marginRight: '6px' }}
          />
          Mostrar igrejas inativas
        </label>
      </div>

      <div style={styles.contador}>
        {igrejasFiltradas.length} igreja{igrejasFiltradas.length !== 1 ? 's' : ''} encontrada{igrejasFiltradas.length !== 1 ? 's' : ''}
      </div>

      {/* TABELA */}
      <div style={styles.tabela}>
        <div style={styles.tabelaHeader}>
          <span style={{ width: '80px' }}>Código</span>
          <span style={{ flex: 3 }}>Nome da Congregação</span>
          <span style={{ flex: 2 }}>Responsável</span>
          <span style={{ flex: 2 }}>Telefone</span>
          <span style={{ width: '80px' }}>Status</span>
          <span style={{ width: '80px' }}></span>
        </div>

        {igrejasFiltradas.length === 0 && (
          <div style={styles.vazio}>
            {filtro ? 'Nenhuma igreja encontrada para essa busca.' : 'Nenhuma igreja cadastrada ainda.'}
          </div>
        )}

        {igrejasFiltradas.map(ig => (
          <div key={ig.id} style={{ ...styles.tabelaLinha, opacity: ig.ativo ? 1 : 0.5 }}>
            <span style={{ width: '80px', fontWeight: '600', color: '#1a3a5c' }}>{ig.codigo}</span>
            <span style={{ flex: 3 }}>{ig.nome}</span>
            <span style={{ flex: 2, color: '#555', fontSize: '13px' }}>{ig.responsavel || '—'}</span>
            <span style={{ flex: 2, color: '#555', fontSize: '13px' }}>{ig.telefone || '—'}</span>
            <span style={{ width: '80px' }}>
              <span style={ig.ativo ? styles.badgeAtivo : styles.badgeInativo}>
                {ig.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </span>
            <span style={{ width: '80px', textAlign: 'right' }}>
              <button onClick={() => abrirEditar(ig)} style={styles.botaoEditar}>Editar</button>
            </span>
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
  formTitulo: { fontSize: '17px', color: '#1a3a5c', marginBottom: '20px', margin: '0 0 20px 0' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  campo: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
  obrig: { color: '#dc2626' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  inputFull: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  erro: { color: '#dc2626', fontSize: '13px', marginBottom: '12px' },
  botoesForm: { display: 'flex', gap: '10px', marginTop: '8px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '9px 24px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  filtros: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' },
  busca: { flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  checkFiltro: { display: 'flex', alignItems: 'center', fontSize: '13px', color: '#555', cursor: 'pointer', whiteSpace: 'nowrap' },
  contador: { fontSize: '13px', color: '#888', marginBottom: '8px' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px' },
  tabelaLinha: { display: 'flex', padding: '13px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px' },
  badgeAtivo: { backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  badgeInativo: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  botaoEditar: { padding: '6px 14px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
}
