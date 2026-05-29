import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Alerta from '../../components/Alerta'

export default function Revistas() {
  const [revistas, setRevistas] = useState([])
  const [tipos, setTipos] = useState([])
  const [filtro, setFiltro] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ codigo: '', nome: '', tipo_id: '', ativo: true })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [alerta, setAlerta] = useState(null) // { titulo, mensagem, tipo, onConfirmar, onCancelar, textoBotao }

  // gestão de tipos
  const [editandoTipo, setEditandoTipo] = useState(null)
  const [formTipo, setFormTipo] = useState({ codigo: '', descricao: '' })
  const [salvandoTipo, setSalvandoTipo] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from('revistas').select('*, tipos_revista(codigo, descricao)').order('codigo'),
      supabase.from('tipos_revista').select('*').order('codigo'),
    ])
    setRevistas(r || [])
    setTipos(t || [])
  }

  function abrirNovo() {
    setForm({ codigo: '', nome: '', tipo_id: tipos[0]?.id || '', ativo: true })
    setEditando('novo')
    setErro('')
  }

  function abrirEditar(r) {
    setForm({ codigo: r.codigo, nome: r.nome, tipo_id: r.tipo_id, ativo: r.ativo })
    setEditando(r.id)
    setErro('')
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.nome.trim() || !form.tipo_id) {
      setErro('Código, nome e tipo são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')

    if (editando === 'novo') {
      const { error } = await supabase.from('revistas').insert({
        codigo: form.codigo.trim().toUpperCase(),
        nome: form.nome.trim(),
        tipo_id: form.tipo_id,
        ativo: form.ativo,
      })
      if (error) {
        setErro(error.code === '23505' ? 'Já existe uma revista com esse código.' : 'Erro: ' + error.message)
        setSalvando(false)
        return
      }
    } else {
      await supabase.from('revistas').update({
        codigo: form.codigo.trim().toUpperCase(),
        nome: form.nome.trim(),
        tipo_id: form.tipo_id,
        ativo: form.ativo,
      }).eq('id', editando)
    }

    setSalvando(false)
    setEditando(null)
    setMensagem('Revista salva com sucesso!')
    setTimeout(() => setMensagem(''), 3000)
    carregar()
  }

  // --- TIPOS ---
  async function excluirTipo(t) {
    const { count } = await supabase
      .from('revistas')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_id', t.id)

    if (count > 0) {
      setAlerta({
        titulo: 'Exclusão bloqueada',
        mensagem: `Não é possível excluir o tipo "${t.descricao}" pois ele está sendo usado por ${count} revista${count > 1 ? 's' : ''} cadastrada${count > 1 ? 's' : ''}. Remova ou altere o tipo das revistas antes de excluir.`,
        tipo: 'erro',
        onConfirmar: () => setAlerta(null),
        textoBotao: 'Entendi',
      })
      return
    }

    setAlerta({
      titulo: 'Excluir tipo',
      mensagem: `Deseja excluir o tipo "${t.descricao}" (${t.codigo})? Esta ação não pode ser desfeita.`,
      tipo: 'perigo',
      textoBotao: 'Sim, excluir',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('tipos_revista').delete().eq('id', t.id)
        setAlerta(null)
        carregar()
      },
    })
  }

  async function excluirRevista(r) {
    const [{ count: countItens }, { count: countPrecos }] = await Promise.all([
      supabase.from('itens_pedido').select('*', { count: 'exact', head: true }).eq('revista_id', r.id),
      supabase.from('precos_revistas').select('*', { count: 'exact', head: true }).eq('revista_id', r.id),
    ])

    if (countItens > 0 || countPrecos > 0) {
      const motivos = []
      if (countPrecos > 0) motivos.push(`preço cadastrado em ${countPrecos} trimestre${countPrecos > 1 ? 's' : ''}`)
      if (countItens > 0) motivos.push(`utilizada em ${countItens} pedido${countItens > 1 ? 's' : ''} de igrejas`)

      setAlerta({
        titulo: 'Exclusão bloqueada',
        mensagem: `Não é possível excluir a revista "${r.nome}" pois ela já foi utilizada no sistema (${motivos.join(' e ')}). Para retirá-la de circulação, use o botão Editar e marque como Inativa.`,
        tipo: 'erro',
        onConfirmar: () => setAlerta(null),
        textoBotao: 'Entendi',
      })
      return
    }

    setAlerta({
      titulo: 'Excluir revista',
      mensagem: `Deseja excluir a revista "${r.nome}" (${r.codigo})? Esta ação não pode ser desfeita.`,
      tipo: 'perigo',
      textoBotao: 'Sim, excluir',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('revistas').delete().eq('id', r.id)
        setAlerta(null)
        setMensagem('Revista excluída com sucesso.')
        setTimeout(() => setMensagem(''), 3000)
        carregar()
      },
    })
  }

  function abrirNovoTipo() {
    setFormTipo({ codigo: '', descricao: '' })
    setEditandoTipo('novo')
  }

  function abrirEditarTipo(t) {
    setFormTipo({ codigo: t.codigo, descricao: t.descricao })
    setEditandoTipo(t.id)
  }

  async function salvarTipo() {
    if (!formTipo.codigo.trim() || !formTipo.descricao.trim()) return
    setSalvandoTipo(true)
    if (editandoTipo === 'novo') {
      await supabase.from('tipos_revista').insert({
        codigo: formTipo.codigo.trim().toUpperCase(),
        descricao: formTipo.descricao.trim(),
      })
    } else {
      await supabase.from('tipos_revista').update({
        codigo: formTipo.codigo.trim().toUpperCase(),
        descricao: formTipo.descricao.trim(),
      }).eq('id', editandoTipo)
    }
    setSalvandoTipo(false)
    setEditandoTipo(null)
    carregar()
  }

  const revistasFiltradas = revistas.filter(r => {
    if (!mostrarInativos && !r.ativo) return false
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return (
      r.codigo.toLowerCase().includes(f) ||
      r.nome.toLowerCase().includes(f) ||
      (r.tipos_revista?.descricao || '').toLowerCase().includes(f)
    )
  })

  return (
    <div style={styles.container}>

      {alerta && <Alerta {...alerta} />}

      {/* TIPOS DE REVISTA */}
      <div style={styles.secaoTipos}>
        <div style={styles.tiposCabecalho}>
          <h3 style={styles.tiposTitulo}>Tipos de Revista</h3>
          <button onClick={abrirNovoTipo} style={styles.botaoNovoTipo}>+ Novo Tipo</button>
        </div>
        <div style={styles.tiposLista}>
          {tipos.map(t => (
            <div key={t.id} style={styles.tipoCard}>
              <span style={styles.tipoCodigo}>{t.codigo}</span>
              <span style={styles.tipoDesc}>{t.descricao}</span>
              <button onClick={() => abrirEditarTipo(t)} style={styles.botaoEditarTipo}>Editar</button>
              <button onClick={() => excluirTipo(t)} style={styles.botaoExcluirTipo}>Excluir</button>
            </div>
          ))}
        </div>
        {editandoTipo && (
          <div style={styles.tipoForm}>
            <input
              value={formTipo.codigo}
              onChange={e => setFormTipo(f => ({ ...f, codigo: e.target.value }))}
              style={{ ...styles.inputPequeno, width: '80px' }}
              placeholder="Ex: J"
              maxLength={5}
            />
            <input
              value={formTipo.descricao}
              onChange={e => setFormTipo(f => ({ ...f, descricao: e.target.value }))}
              style={styles.inputPequeno}
              placeholder="Descrição do tipo (Ex: Jovem)"
            />
            <button onClick={salvarTipo} disabled={salvandoTipo} style={styles.botaoSalvarTipo}>
              {salvandoTipo ? '...' : 'Salvar'}
            </button>
            <button onClick={() => setEditandoTipo(null)} style={styles.botaoCancelarTipo}>Cancelar</button>
          </div>
        )}
      </div>

      {/* REVISTAS */}
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Cadastro de Revistas</h2>
        <button onClick={abrirNovo} style={styles.botaoNovo}>+ Nova Revista</button>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {editando && (
        <div style={styles.formulario}>
          <h3 style={styles.formTitulo}>{editando === 'novo' ? 'Nova Revista' : 'Editar Revista'}</h3>
          <div style={styles.grid3}>
            <div style={styles.campo}>
              <label style={styles.label}>Código <span style={styles.obrig}>*</span></label>
              <input
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                style={styles.input}
                placeholder="Ex: 100-A"
              />
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Tipo <span style={styles.obrig}>*</span></label>
              <select
                value={form.tipo_id}
                onChange={e => setForm(f => ({ ...f, tipo_id: e.target.value }))}
                style={styles.select}
              >
                <option value="">Selecione...</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.codigo} — {t.descricao}</option>
                ))}
              </select>
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
            <label style={styles.label}>Nome completo da revista <span style={styles.obrig}>*</span></label>
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              style={styles.inputFull}
              placeholder="Ex: O Mensageiro da Paz — Adulto"
            />
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

      <div style={styles.filtros}>
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={styles.busca}
          placeholder="Buscar por código, nome ou tipo..."
        />
        <label style={styles.checkFiltro}>
          <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} style={{ marginRight: '6px' }} />
          Mostrar inativas
        </label>
      </div>

      <div style={styles.contador}>{revistasFiltradas.length} revista{revistasFiltradas.length !== 1 ? 's' : ''}</div>

      <div style={styles.tabela}>
        <div style={styles.tabelaHeader}>
          <span style={{ width: '100px' }}>Código</span>
          <span style={{ flex: 3 }}>Nome</span>
          <span style={{ width: '120px' }}>Tipo</span>
          <span style={{ width: '80px' }}>Status</span>
          <span style={{ width: '120px' }}></span>
        </div>
        {revistasFiltradas.length === 0 && (
          <div style={styles.vazio}>{filtro ? 'Nenhuma revista encontrada.' : 'Nenhuma revista cadastrada ainda.'}</div>
        )}
        {revistasFiltradas.map(r => (
          <div key={r.id} style={{ ...styles.tabelaLinha, opacity: r.ativo ? 1 : 0.5 }}>
            <span style={{ width: '100px', fontWeight: '600', color: '#1a3a5c' }}>{r.codigo}</span>
            <span style={{ flex: 3 }}>{r.nome}</span>
            <span style={{ width: '120px' }}>
              <span style={styles.tagTipo}>{r.tipos_revista?.codigo} — {r.tipos_revista?.descricao}</span>
            </span>
            <span style={{ width: '80px' }}>
              <span style={r.ativo ? styles.badgeAtivo : styles.badgeInativo}>{r.ativo ? 'Ativa' : 'Inativa'}</span>
            </span>
            <span style={{ width: '120px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button onClick={() => abrirEditar(r)} style={styles.botaoEditar}>Editar</button>
              <button onClick={() => excluirRevista(r)} style={styles.botaoExcluir}>Excluir</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  secaoTipos: { backgroundColor: '#fff', borderRadius: '10px', padding: '18px 22px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  tiposCabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  tiposTitulo: { fontSize: '15px', color: '#1a3a5c', margin: 0 },
  botaoNovoTipo: { padding: '6px 14px', backgroundColor: '#e0f0ff', color: '#1a3a5c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  tiposLista: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' },
  tipoCard: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '7px', padding: '6px 12px', fontSize: '13px' },
  tipoCodigo: { fontWeight: '700', color: '#1a3a5c', minWidth: '24px' },
  tipoDesc: { color: '#444' },
  botaoEditarTipo: { padding: '2px 8px', backgroundColor: 'transparent', color: '#888', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  botaoExcluirTipo: { padding: '2px 8px', backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  tipoForm: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' },
  inputPequeno: { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' },
  botaoSalvarTipo: { padding: '7px 14px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  botaoCancelarTipo: { padding: '7px 14px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: 0 },
  botaoNovo: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  formulario: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitulo: { fontSize: '17px', color: '#1a3a5c', margin: '0 0 20px 0' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  campo: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
  obrig: { color: '#dc2626' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  inputFull: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  erro: { color: '#dc2626', fontSize: '13px', marginBottom: '12px' },
  botoesForm: { display: 'flex', gap: '10px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '9px 24px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  filtros: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' },
  busca: { flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  checkFiltro: { display: 'flex', alignItems: 'center', fontSize: '13px', color: '#555', cursor: 'pointer', whiteSpace: 'nowrap' },
  contador: { fontSize: '13px', color: '#888', marginBottom: '8px' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px' },
  tabelaLinha: { display: 'flex', padding: '13px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px' },
  tagTipo: { backgroundColor: '#f0f4f8', color: '#444', fontSize: '12px', padding: '3px 10px', borderRadius: '20px' },
  badgeAtivo: { backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  badgeInativo: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  botaoEditar: { padding: '6px 14px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  botaoExcluir: { padding: '6px 14px', backgroundColor: '#fff0f0', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
}
