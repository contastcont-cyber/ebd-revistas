import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Alerta from '../../components/Alerta'

export default function Entregas() {
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSel, setTrimestreSel] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [aba, setAba] = useState('pendentes') // 'pendentes' | 'retirados'
  const [alerta, setAlerta] = useState(null)
  const [registrando, setRegistrando] = useState(null) // pedido sendo registrado
  const [formEntrega, setFormEntrega] = useState({ data_retirada: hoje(), responsavel_retirada: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  function hoje() {
    return new Date().toISOString().split('T')[0]
  }

  useEffect(() => { carregarTrimestres() }, [])
  useEffect(() => { if (trimestreSel) carregarPedidos() }, [trimestreSel])

  async function carregarTrimestres() {
    const { data } = await supabase
      .from('trimestres')
      .select('*')
      .order('ano', { ascending: false })
      .order('numero', { ascending: false })
    setTrimestres(data || [])
    const aberto = (data || []).find(t => t.status === 'aberto') || (data || [])[0]
    if (aberto) setTrimestreSel(aberto.id)
  }

  async function carregarPedidos() {
    setCarregando(true)
    const { data } = await supabase
      .from('pedidos_igrejas')
      .select('*, igrejas(codigo, nome, responsavel, telefone), entregas(*)')
      .eq('trimestre_id', trimestreSel)
      .order('igrejas(codigo)')
    setPedidos(data || [])
    setCarregando(false)
  }

  function abrirRegistro(pedido) {
    setFormEntrega({
      data_retirada: hoje(),
      responsavel_retirada: pedido.igrejas?.responsavel || '',
      observacao: '',
    })
    setRegistrando(pedido)
  }

  async function salvarEntrega() {
    if (!formEntrega.data_retirada) return
    setSalvando(true)

    await supabase.from('entregas').insert({
      pedido_id: registrando.id,
      data_retirada: formEntrega.data_retirada,
      responsavel_retirada: formEntrega.responsavel_retirada,
      observacao: formEntrega.observacao,
    })

    await supabase.from('pedidos_igrejas').update({ status: 'retirado' }).eq('id', registrando.id)

    setSalvando(false)
    setRegistrando(null)
    setMensagem(`Retirada de ${registrando.igrejas?.nome} registrada!`)
    setTimeout(() => setMensagem(''), 3000)
    carregarPedidos()
  }

  async function desfazerRetirada(pedido) {
    setAlerta({
      titulo: 'Desfazer retirada?',
      mensagem: `Deseja desfazer o registro de retirada de ${pedido.igrejas?.nome}? O pedido voltará para a lista de pendentes.`,
      tipo: 'aviso',
      textoBotao: 'Sim, desfazer',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('entregas').delete().eq('pedido_id', pedido.id)
        await supabase.from('pedidos_igrejas').update({ status: 'pendente' }).eq('id', pedido.id)
        setAlerta(null)
        setMensagem('Retirada desfeita.')
        setTimeout(() => setMensagem(''), 3000)
        carregarPedidos()
      },
    })
  }

  function diasDesde(dataCriacao) {
    const diff = Math.floor((new Date() - new Date(dataCriacao)) / (1000 * 60 * 60 * 24))
    return diff
  }

  function formatarData(iso) {
    if (!iso) return '—'
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
  }

  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]
  const trimestreAtual = trimestres.find(t => t.id === trimestreSel)

  const pendentes = pedidos.filter(p => p.status !== 'retirado')
  const retirados = pedidos.filter(p => p.status === 'retirado')

  const filtrar = (lista) => lista.filter(p => {
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return String(p.igrejas?.codigo).includes(f) || (p.igrejas?.nome || '').toLowerCase().includes(f)
  })

  const pendentesFiltrados = filtrar(pendentes)
  const retiradosFiltrados = filtrar(retirados)

  return (
    <div style={styles.container}>
      {alerta && <Alerta {...alerta} />}

      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Controle de Entregas</h2>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {/* MODAL REGISTRO DE RETIRADA */}
      {registrando && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Registrar Retirada</h3>
              <button onClick={() => setRegistrando(null)} style={styles.modalFechar}>✕</button>
            </div>
            <div style={styles.modalCorpo}>
              <p style={styles.modalIgreja}>
                <strong>{registrando.igrejas?.codigo}</strong> — {registrando.igrejas?.nome}
              </p>
              <div style={styles.campo}>
                <label style={styles.label}>Data da retirada</label>
                <input
                  type="date"
                  value={formEntrega.data_retirada}
                  onChange={e => setFormEntrega(f => ({ ...f, data_retirada: e.target.value }))}
                  style={styles.input}
                />
              </div>
              <div style={styles.campo}>
                <label style={styles.label}>Responsável pela retirada</label>
                <input
                  value={formEntrega.responsavel_retirada}
                  onChange={e => setFormEntrega(f => ({ ...f, responsavel_retirada: e.target.value }))}
                  style={styles.input}
                  placeholder="Nome de quem retirou"
                />
              </div>
              <div style={styles.campo}>
                <label style={styles.label}>Observação (opcional)</label>
                <input
                  value={formEntrega.observacao}
                  onChange={e => setFormEntrega(f => ({ ...f, observacao: e.target.value }))}
                  style={styles.input}
                  placeholder="Ex: retirou apenas parte do pedido"
                />
              </div>
              <div style={styles.modalBotoes}>
                <button onClick={() => setRegistrando(null)} style={styles.botaoCancelar}>Cancelar</button>
                <button onClick={salvarEntrega} disabled={salvando} style={styles.botaoConfirmar}>
                  {salvando ? 'Salvando...' : '✓ Confirmar Retirada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELETOR */}
      {trimestres.length > 0 && (
        <div style={styles.seletorBox}>
          <label style={styles.label}>Trimestre</label>
          <select value={trimestreSel} onChange={e => setTrimestreSel(e.target.value)} style={styles.select}>
            {trimestres.map(t => (
              <option key={t.id} value={t.id}>
                {numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}
              </option>
            ))}
          </select>
          <span style={trimestreAtual?.status === 'aberto' ? styles.badgeAberto : styles.badgeFechado}>
            {trimestreAtual?.status === 'aberto' ? '● Aberto' : '■ Fechado'}
          </span>
        </div>
      )}

      {/* RESUMO */}
      {!carregando && pedidos.length > 0 && (
        <div style={styles.resumo}>
          <div style={{ ...styles.resumoCard, borderTop: '4px solid #dc2626' }}>
            <span style={styles.resumoNum}>{pendentes.length}</span>
            <span style={styles.resumoLabel}>Pendentes de retirada</span>
          </div>
          <div style={{ ...styles.resumoCard, borderTop: '4px solid #059669' }}>
            <span style={styles.resumoNum}>{retirados.length}</span>
            <span style={styles.resumoLabel}>Já retiraram</span>
          </div>
          <div style={{ ...styles.resumoCard, borderTop: '4px solid #1a3a5c' }}>
            <span style={styles.resumoNum}>{pedidos.length}</span>
            <span style={styles.resumoLabel}>Total de pedidos</span>
          </div>
        </div>
      )}

      {/* BUSCA E ABAS */}
      <input value={filtro} onChange={e => setFiltro(e.target.value)} style={styles.busca} placeholder="Buscar por código ou nome da igreja..." />

      <div style={styles.abas}>
        <button onClick={() => setAba('pendentes')} style={aba === 'pendentes' ? { ...styles.aba, ...styles.abaAtiva } : styles.aba}>
          Pendentes ({pendentes.length})
        </button>
        <button onClick={() => setAba('retirados')} style={aba === 'retirados' ? { ...styles.aba, ...styles.abaAtiva } : styles.aba}>
          Retirados ({retirados.length})
        </button>
      </div>

      {carregando && <div style={styles.vazio}>Carregando...</div>}

      {/* LISTA PENDENTES */}
      {!carregando && aba === 'pendentes' && (
        <div style={styles.tabela}>
          <div style={styles.tabelaHeader}>
            <span style={{ width: '70px' }}>Código</span>
            <span style={{ flex: 2 }}>Igreja</span>
            <span style={{ flex: 2 }}>Responsável</span>
            <span style={{ flex: 1 }}>Telefone</span>
            <span style={{ width: '90px', textAlign: 'center' }}>Dias</span>
            <span style={{ width: '150px' }}></span>
          </div>
          {pendentesFiltrados.length === 0 && (
            <div style={styles.vazio}>
              {filtro ? 'Nenhuma igreja encontrada.' : '✅ Todas as igrejas já retiraram!'}
            </div>
          )}
          {pendentesFiltrados.map(p => {
            const dias = diasDesde(p.criado_em)
            const urgente = dias >= 14
            return (
              <div key={p.id} style={{ ...styles.tabelaLinha, backgroundColor: urgente ? '#fff8f8' : '#fff' }}>
                <span style={{ width: '70px', fontWeight: '600', color: '#1a3a5c' }}>{p.igrejas?.codigo}</span>
                <span style={{ flex: 2 }}>{p.igrejas?.nome}</span>
                <span style={{ flex: 2, fontSize: '13px', color: '#555' }}>{p.igrejas?.responsavel || '—'}</span>
                <span style={{ flex: 1, fontSize: '13px', color: '#555' }}>{p.igrejas?.telefone || '—'}</span>
                <span style={{ width: '90px', textAlign: 'center' }}>
                  <span style={urgente ? styles.diasUrgente : styles.diasNormal}>{dias}d</span>
                </span>
                <span style={{ width: '150px', textAlign: 'right' }}>
                  <button onClick={() => abrirRegistro(p)} style={styles.botaoRetirada}>
                    ✓ Registrar Retirada
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* LISTA RETIRADOS */}
      {!carregando && aba === 'retirados' && (
        <div style={styles.tabela}>
          <div style={styles.tabelaHeader}>
            <span style={{ width: '70px' }}>Código</span>
            <span style={{ flex: 2 }}>Igreja</span>
            <span style={{ flex: 2 }}>Responsável pela retirada</span>
            <span style={{ width: '120px', textAlign: 'center' }}>Data</span>
            <span style={{ width: '100px' }}></span>
          </div>
          {retiradosFiltrados.length === 0 && (
            <div style={styles.vazio}>{filtro ? 'Nenhuma igreja encontrada.' : 'Nenhuma retirada registrada ainda.'}</div>
          )}
          {retiradosFiltrados.map(p => {
            const entrega = p.entregas?.[0]
            return (
              <div key={p.id} style={styles.tabelaLinha}>
                <span style={{ width: '70px', fontWeight: '600', color: '#1a3a5c' }}>{p.igrejas?.codigo}</span>
                <span style={{ flex: 2 }}>{p.igrejas?.nome}</span>
                <span style={{ flex: 2, fontSize: '13px', color: '#555' }}>{entrega?.responsavel_retirada || '—'}</span>
                <span style={{ width: '120px', textAlign: 'center', fontSize: '13px', color: '#555' }}>
                  {formatarData(entrega?.data_retirada)}
                </span>
                <span style={{ width: '100px', textAlign: 'right' }}>
                  <button onClick={() => desfazerRetirada(p)} style={styles.botaoDesfazer}>Desfazer</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: 0 },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  seletorBox: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' },
  select: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  badgeAberto: { backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeFechado: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap' },
  resumo: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' },
  resumoCard: { backgroundColor: '#fff', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '4px' },
  resumoNum: { fontSize: '28px', fontWeight: '700', color: '#1a3a5c' },
  resumoLabel: { fontSize: '13px', color: '#888' },
  busca: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', marginBottom: '16px' },
  abas: { display: 'flex', gap: '4px', borderBottom: '2px solid #e5e7eb', marginBottom: '16px' },
  aba: { padding: '10px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#666', borderBottom: '3px solid transparent', marginBottom: '-2px' },
  abaAtiva: { color: '#1a3a5c', fontWeight: '700', borderBottom: '3px solid #1a3a5c' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px' },
  tabelaLinha: { display: 'flex', padding: '13px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px' },
  diasNormal: { backgroundColor: '#f0f4f8', color: '#555', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  diasUrgente: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  botaoRetirada: { padding: '7px 14px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
  botaoDesfazer: { padding: '6px 14px', backgroundColor: '#f0f4f8', color: '#666', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { backgroundColor: '#1a3a5c', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { color: '#fff', fontSize: '16px', fontWeight: '700', margin: 0 },
  modalFechar: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  modalCorpo: { padding: '24px' },
  modalIgreja: { fontSize: '15px', color: '#1a3a5c', marginBottom: '20px', padding: '10px 14px', backgroundColor: '#f0f4f8', borderRadius: '7px' },
  campo: { marginBottom: '16px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  modalBotoes: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoConfirmar: { padding: '9px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}
