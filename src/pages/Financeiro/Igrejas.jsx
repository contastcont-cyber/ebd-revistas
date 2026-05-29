import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Alerta from '../../components/Alerta'

export default function FinanceiroIgrejas() {
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSel, setTrimestreSel] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [aba, setAba] = useState('pendentes')
  const [alerta, setAlerta] = useState(null)
  const [pagando, setPagando] = useState(null) // { pedido, parcela }
  const [formPag, setFormPag] = useState({ data_pagamento: hoje(), forma_pagamento: 'pix', valor: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [ajustando, setAjustando] = useState(null) // parcela sendo ajustada

  function hoje() { return new Date().toISOString().split('T')[0] }

  useEffect(() => { carregarTrimestres() }, [])
  useEffect(() => { if (trimestreSel) carregarPedidos() }, [trimestreSel])

  async function carregarTrimestres() {
    const { data } = await supabase.from('trimestres').select('*').order('ano', { ascending: false }).order('numero', { ascending: false })
    setTrimestres(data || [])
    const aberto = (data || []).find(t => t.status === 'aberto') || (data || [])[0]
    if (aberto) setTrimestreSel(aberto.id)
  }

  async function carregarPedidos() {
    setCarregando(true)
    const { data } = await supabase
      .from('pedidos_igrejas')
      .select('*, igrejas(codigo, nome, responsavel, telefone), parcelas_igrejas(*)')
      .eq('trimestre_id', trimestreSel)
      .order('igrejas(codigo)')
    setPedidos(data || [])
    setCarregando(false)
  }

  function abrirPagamento(pedido, parcela) {
    setFormPag({
      data_pagamento: hoje(),
      forma_pagamento: 'pix',
      valor: String(Number(parcela.valor).toFixed(2)),
      observacao: '',
    })
    setPagando({ pedido, parcela })
  }

  async function salvarPagamento() {
    setSalvando(true)
    await supabase.from('parcelas_igrejas').update({
      pago: true,
      data_pagamento: formPag.data_pagamento,
      forma_pagamento: formPag.forma_pagamento,
      valor: parseFloat(formPag.valor),
      observacao: formPag.observacao,
    }).eq('id', pagando.parcela.id)
    setSalvando(false)
    setPagando(null)
    setMensagem(`Pagamento da parcela ${pagando.parcela.numero_parcela} de ${pagando.pedido.igrejas?.nome} registrado!`)
    setTimeout(() => setMensagem(''), 3000)
    carregarPedidos()
  }

  async function desfazerPagamento(parcela, nomeIgreja) {
    setAlerta({
      titulo: 'Desfazer pagamento?',
      mensagem: `Deseja desfazer o pagamento da parcela ${parcela.numero_parcela} de ${nomeIgreja}?`,
      tipo: 'aviso',
      textoBotao: 'Sim, desfazer',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('parcelas_igrejas').update({
          pago: false, data_pagamento: null, forma_pagamento: null, observacao: null,
        }).eq('id', parcela.id)
        setAlerta(null)
        setMensagem('Pagamento desfeito.')
        setTimeout(() => setMensagem(''), 3000)
        carregarPedidos()
      },
    })
  }

  async function salvarAjuste(parcela, novoValor) {
    const valor = parseFloat(String(novoValor).replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    await supabase.from('parcelas_igrejas').update({ valor }).eq('id', parcela.id)
    setAjustando(null)
    carregarPedidos()
  }

  function formatarData(iso) {
    if (!iso) return '—'
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
  }

  function formatarValor(v) {
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]
  const trimestreAtual = trimestres.find(t => t.id === trimestreSel)

  // Calcula totais
  const totalGeral = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0)
  const totalRecebido = pedidos.reduce((s, p) =>
    s + (p.parcelas_igrejas || []).filter(x => x.pago).reduce((ss, x) => ss + Number(x.valor), 0), 0)
  const totalPendente = totalGeral - totalRecebido

  const pendentes = pedidos.filter(p => (p.parcelas_igrejas || []).some(x => !x.pago))
  const quitados = pedidos.filter(p => (p.parcelas_igrejas || []).length > 0 && (p.parcelas_igrejas || []).every(x => x.pago))

  const filtrar = (lista) => lista.filter(p => {
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return String(p.igrejas?.codigo).includes(f) || (p.igrejas?.nome || '').toLowerCase().includes(f)
  })

  return (
    <div style={styles.container}>
      {alerta && <Alerta {...alerta} />}

      {/* MODAL PAGAMENTO */}
      {pagando && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Registrar Pagamento</h3>
              <button onClick={() => setPagando(null)} style={styles.modalFechar}>✕</button>
            </div>
            <div style={styles.modalCorpo}>
              <p style={styles.modalInfo}>
                <strong>{pagando.pedido.igrejas?.codigo} — {pagando.pedido.igrejas?.nome}</strong><br />
                Parcela {pagando.parcela.numero_parcela} de {pagando.pedido.parcelas_igrejas?.length}
              </p>
              <div style={styles.grid2}>
                <div style={styles.campo}>
                  <label style={styles.label}>Data do pagamento</label>
                  <input type="date" value={formPag.data_pagamento} onChange={e => setFormPag(f => ({ ...f, data_pagamento: e.target.value }))} style={styles.input} />
                </div>
                <div style={styles.campo}>
                  <label style={styles.label}>Forma de pagamento</label>
                  <select value={formPag.forma_pagamento} onChange={e => setFormPag(f => ({ ...f, forma_pagamento: e.target.value }))} style={styles.select}>
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>
              <div style={styles.campo}>
                <label style={styles.label}>Valor recebido (R$)</label>
                <input type="number" step="0.01" value={formPag.valor} onChange={e => setFormPag(f => ({ ...f, valor: e.target.value }))} style={styles.input} />
              </div>
              <div style={styles.campo}>
                <label style={styles.label}>Observação (opcional)</label>
                <input value={formPag.observacao} onChange={e => setFormPag(f => ({ ...f, observacao: e.target.value }))} style={styles.input} placeholder="Ex: pagamento parcial" />
              </div>
              <div style={styles.modalBotoes}>
                <button onClick={() => setPagando(null)} style={styles.botaoCancelar}>Cancelar</button>
                <button onClick={salvarPagamento} disabled={salvando} style={styles.botaoConfirmar}>
                  {salvando ? 'Salvando...' : '✓ Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 style={styles.titulo}>Financeiro — Igrejas</h2>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {/* SELETOR */}
      <div style={styles.seletorBox}>
        <label style={styles.label}>Trimestre</label>
        <select value={trimestreSel} onChange={e => setTrimestreSel(e.target.value)} style={styles.select}>
          {trimestres.map(t => (
            <option key={t.id} value={t.id}>{numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}{t.status === 'fechado' ? ' (fechado)' : ''}</option>
          ))}
        </select>
        <span style={trimestreAtual?.status === 'aberto' ? styles.badgeAberto : styles.badgeFechado}>
          {trimestreAtual?.status === 'aberto' ? '● Aberto' : '■ Fechado'}
        </span>
      </div>

      {/* BALANCETE */}
      {!carregando && pedidos.length > 0 && (
        <div style={styles.balancete}>
          <div style={{ ...styles.balCard, borderTop: '4px solid #1a3a5c' }}>
            <span style={styles.balLabel}>Total a receber</span>
            <span style={styles.balValor}>R$ {formatarValor(totalGeral)}</span>
          </div>
          <div style={{ ...styles.balCard, borderTop: '4px solid #059669' }}>
            <span style={styles.balLabel}>Total recebido</span>
            <span style={{ ...styles.balValor, color: '#059669' }}>R$ {formatarValor(totalRecebido)}</span>
          </div>
          <div style={{ ...styles.balCard, borderTop: '4px solid #dc2626' }}>
            <span style={styles.balLabel}>Saldo pendente</span>
            <span style={{ ...styles.balValor, color: '#dc2626' }}>R$ {formatarValor(totalPendente)}</span>
          </div>
          <div style={{ ...styles.balCard, borderTop: '4px solid #888' }}>
            <span style={styles.balLabel}>Igrejas quitadas</span>
            <span style={styles.balValor}>{quitados.length} / {pedidos.length}</span>
          </div>
        </div>
      )}

      {/* BUSCA E ABAS */}
      <input value={filtro} onChange={e => setFiltro(e.target.value)} style={styles.busca} placeholder="Buscar por código ou nome da igreja..." />
      <div style={styles.abas}>
        <button onClick={() => setAba('pendentes')} style={aba === 'pendentes' ? { ...styles.aba, ...styles.abaAtiva } : styles.aba}>
          Com parcelas pendentes ({pendentes.length})
        </button>
        <button onClick={() => setAba('quitados')} style={aba === 'quitados' ? { ...styles.aba, ...styles.abaAtiva } : styles.aba}>
          Quitadas ({quitados.length})
        </button>
      </div>

      {carregando && <div style={styles.vazio}>Carregando...</div>}

      {/* TABELA */}
      {!carregando && (() => {
        const lista = filtrar(aba === 'pendentes' ? pendentes : quitados)
        return (
          <div style={styles.tabela}>
            <div style={styles.tabelaHeader}>
              <span style={{ width: '70px' }}>Código</span>
              <span style={{ flex: 2 }}>Igreja</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
              <span style={{ flex: 3 }}>Parcelas</span>
            </div>
            {lista.length === 0 && <div style={styles.vazio}>{filtro ? 'Nenhuma igreja encontrada.' : aba === 'pendentes' ? '✅ Todas as igrejas estão em dia!' : 'Nenhuma igreja quitada ainda.'}</div>}
            {lista.map(p => (
              <div key={p.id} style={styles.tabelaLinha}>
                <span style={{ width: '70px', fontWeight: '600', color: '#1a3a5c' }}>{p.igrejas?.codigo}</span>
                <span style={{ flex: 2 }}>{p.igrejas?.nome}</span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: '600', color: '#1a3a5c' }}>
                  R$ {formatarValor(p.valor_total)}
                </span>
                <span style={{ flex: 3, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(p.parcelas_igrejas || []).sort((a, b) => a.numero_parcela - b.numero_parcela).map(parc => (
                    <div key={parc.id} style={parc.pago ? styles.parcelaQuitada : styles.parcelaPendente}>
                      <div style={styles.parcelaNum}>Parcela {parc.numero_parcela}</div>
                      {ajustando === parc.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number" step="0.01"
                            defaultValue={Number(parc.valor).toFixed(2)}
                            id={`ajuste-${parc.id}`}
                            style={{ width: '90px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '13px' }}
                            autoFocus
                          />
                          <button onClick={() => salvarAjuste(parc, document.getElementById(`ajuste-${parc.id}`).value)} style={styles.miniBotaoOk}>✓</button>
                          <button onClick={() => setAjustando(null)} style={styles.miniBotaoX}>✕</button>
                        </div>
                      ) : (
                        <div style={styles.parcelaValor}>
                          R$ {formatarValor(parc.valor)}
                          {!parc.pago && <button onClick={() => setAjustando(parc.id)} style={styles.miniBotaoAjuste} title="Ajustar valor">✎</button>}
                        </div>
                      )}
                      {parc.pago ? (
                        <div style={styles.parcelaInfo}>
                          {parc.forma_pagamento?.toUpperCase()} · {formatarData(parc.data_pagamento)}
                          <button onClick={() => desfazerPagamento(parc, p.igrejas?.nome)} style={styles.miniBotaoDesfazer}>↩</button>
                        </div>
                      ) : (
                        <button onClick={() => abrirPagamento(p, parc)} style={styles.botaoPagar}>$ Receber</button>
                      )}
                    </div>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', marginBottom: '20px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  seletorBox: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' },
  select: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  badgeAberto: { backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeFechado: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap' },
  balancete: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' },
  balCard: { backgroundColor: '#fff', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '6px' },
  balLabel: { fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  balValor: { fontSize: '20px', fontWeight: '700', color: '#1a3a5c' },
  busca: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', marginBottom: '16px' },
  abas: { display: 'flex', gap: '4px', borderBottom: '2px solid #e5e7eb', marginBottom: '16px' },
  aba: { padding: '10px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#666', borderBottom: '3px solid transparent', marginBottom: '-2px' },
  abaAtiva: { color: '#1a3a5c', fontWeight: '700', borderBottom: '3px solid #1a3a5c' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px' },
  tabelaLinha: { display: 'flex', padding: '14px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px' },
  parcelaPendente: { backgroundColor: '#fff8f0', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px' },
  parcelaQuitada: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px' },
  parcelaNum: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  parcelaValor: { fontSize: '15px', fontWeight: '700', color: '#1a3a5c', display: 'flex', alignItems: 'center', gap: '6px' },
  parcelaInfo: { fontSize: '11px', color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' },
  botaoPagar: { padding: '5px 12px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginTop: '2px', alignSelf: 'flex-start' },
  miniBotaoAjuste: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '13px', padding: '0 2px' },
  miniBotaoDesfazer: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '13px', padding: '0 2px' },
  miniBotaoOk: { padding: '3px 8px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  miniBotaoX: { padding: '3px 8px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { backgroundColor: '#1a3a5c', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { color: '#fff', fontSize: '16px', fontWeight: '700', margin: 0 },
  modalFechar: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  modalCorpo: { padding: '24px' },
  modalInfo: { fontSize: '14px', color: '#1a3a5c', marginBottom: '20px', padding: '10px 14px', backgroundColor: '#f0f4f8', borderRadius: '7px', lineHeight: '1.6' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  campo: { marginBottom: '16px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  modalBotoes: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoConfirmar: { padding: '9px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}
