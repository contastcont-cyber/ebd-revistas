import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Alerta from '../../components/Alerta'

export default function FinanceiroEditora() {
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSel, setTrimestreSel] = useState('')
  const [pedido, setPedido] = useState(null)
  const [parcelas, setParcelas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [alerta, setAlerta] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)

  // form novo pedido editora
  const [formPedido, setFormPedido] = useState({ valor_total: '' })
  const [criandoPedido, setCriandoPedido] = useState(false)

  // form nova parcela
  const [adicionandoParcela, setAdicionandoParcela] = useState(false)
  const [formParcela, setFormParcela] = useState({ valor: '', vencimento: '', numero_parcela: 1 })

  // pagamento
  const [pagando, setPagando] = useState(null)
  const [formPag, setFormPag] = useState({ data_pagamento: hoje(), valor: '' })

  function hoje() { return new Date().toISOString().split('T')[0] }
  function formatarValor(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
  function formatarData(iso) { if (!iso) return '—'; return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') }
  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]
  const trimestreAtual = trimestres.find(t => t.id === trimestreSel)

  useEffect(() => { carregarTrimestres() }, [])
  useEffect(() => { if (trimestreSel) carregarDados() }, [trimestreSel])

  async function carregarTrimestres() {
    const { data } = await supabase.from('trimestres').select('*').order('ano', { ascending: false }).order('numero', { ascending: false })
    setTrimestres(data || [])
    const aberto = (data || []).find(t => t.status === 'aberto') || (data || [])[0]
    if (aberto) setTrimestreSel(aberto.id)
  }

  async function carregarDados() {
    setCarregando(true)
    const { data: ped } = await supabase.from('pedido_editora').select('*').eq('trimestre_id', trimestreSel).single()
    setPedido(ped || null)

    if (ped) {
      const { data: parc } = await supabase.from('parcelas_editora').select('*').eq('pedido_editora_id', ped.id).order('numero_parcela')
      setParcelas(parc || [])
    } else {
      setParcelas([])
    }
    setCarregando(false)
  }

  // Sugere valor total dos pedidos das igrejas
  async function sugerirValor() {
    const { data } = await supabase.from('pedidos_igrejas').select('valor_total').eq('trimestre_id', trimestreSel)
    const total = (data || []).reduce((s, p) => s + Number(p.valor_total || 0), 0)
    setFormPedido({ valor_total: total.toFixed(2) })
  }

  async function criarPedido() {
    const valor = parseFloat(formPedido.valor_total)
    if (isNaN(valor) || valor <= 0) return
    setSalvando(true)
    await supabase.from('pedido_editora').insert({ trimestre_id: trimestreSel, valor_total: valor })
    setSalvando(false)
    setCriandoPedido(false)
    setMensagem('Pedido à editora registrado!')
    setTimeout(() => setMensagem(''), 3000)
    carregarDados()
  }

  async function adicionarParcela() {
    const valor = parseFloat(String(formParcela.valor).replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    setSalvando(true)
    await supabase.from('parcelas_editora').insert({
      pedido_editora_id: pedido.id,
      numero_parcela: parcelas.length + 1,
      valor,
      vencimento: formParcela.vencimento || null,
    })
    setSalvando(false)
    setAdicionandoParcela(false)
    setFormParcela({ valor: '', vencimento: '' })
    carregarDados()
  }

  async function salvarPagamento() {
    setSalvando(true)
    await supabase.from('parcelas_editora').update({
      pago: true,
      data_pagamento: formPag.data_pagamento,
      valor: parseFloat(formPag.valor),
    }).eq('id', pagando.id)
    setSalvando(false)
    setPagando(null)
    setMensagem(`Parcela ${pagando.numero_parcela} paga à editora!`)
    setTimeout(() => setMensagem(''), 3000)
    carregarDados()
  }

  async function desfazerPagamento(parcela) {
    setAlerta({
      titulo: 'Desfazer pagamento?',
      mensagem: `Deseja desfazer o pagamento da parcela ${parcela.numero_parcela} à editora?`,
      tipo: 'aviso',
      textoBotao: 'Sim, desfazer',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('parcelas_editora').update({ pago: false, data_pagamento: null }).eq('id', parcela.id)
        setAlerta(null)
        carregarDados()
      },
    })
  }

  async function excluirParcela(parcela) {
    if (parcela.pago) return
    setAlerta({
      titulo: 'Excluir parcela?',
      mensagem: `Deseja excluir a parcela ${parcela.numero_parcela}?`,
      tipo: 'perigo',
      textoBotao: 'Sim, excluir',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('parcelas_editora').delete().eq('id', parcela.id)
        setAlerta(null)
        carregarDados()
      },
    })
  }

  const totalPago = parcelas.filter(p => p.pago).reduce((s, p) => s + Number(p.valor), 0)
  const totalParcelas = parcelas.reduce((s, p) => s + Number(p.valor), 0)
  const saldoDevedor = Number(pedido?.valor_total || 0) - totalPago

  return (
    <div style={styles.container}>
      {alerta && <Alerta {...alerta} />}

      {/* MODAL PAGAMENTO */}
      {pagando && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitulo}>Pagar Parcela {pagando.numero_parcela} — Editora</h3>
              <button onClick={() => setPagando(null)} style={styles.modalFechar}>✕</button>
            </div>
            <div style={styles.modalCorpo}>
              <div style={styles.campo}>
                <label style={styles.label}>Data do pagamento</label>
                <input type="date" value={formPag.data_pagamento} onChange={e => setFormPag(f => ({ ...f, data_pagamento: e.target.value }))} style={styles.input} />
              </div>
              <div style={styles.campo}>
                <label style={styles.label}>Valor pago (R$)</label>
                <input type="number" step="0.01" value={formPag.valor} onChange={e => setFormPag(f => ({ ...f, valor: e.target.value }))} style={styles.input} />
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

      <h2 style={styles.titulo}>Financeiro — Editora</h2>
      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {/* SELETOR */}
      <div style={styles.seletorBox}>
        <label style={styles.label}>Trimestre</label>
        <select value={trimestreSel} onChange={e => setTrimestreSel(e.target.value)} style={styles.select}>
          {trimestres.map(t => (
            <option key={t.id} value={t.id}>{numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}</option>
          ))}
        </select>
        <span style={trimestreAtual?.status === 'aberto' ? styles.badgeAberto : styles.badgeFechado}>
          {trimestreAtual?.status === 'aberto' ? '● Aberto' : '■ Fechado'}
        </span>
      </div>

      {carregando && <div style={styles.vazio}>Carregando...</div>}

      {/* SEM PEDIDO */}
      {!carregando && !pedido && (
        <div style={styles.card}>
          <p style={{ color: '#666', marginBottom: '16px' }}>Nenhum pedido à editora registrado para este trimestre.</p>
          {!criandoPedido ? (
            <button onClick={() => { setCriandoPedido(true); sugerirValor() }} style={styles.botaoNovo}>
              + Registrar Pedido à Editora
            </button>
          ) : (
            <div style={styles.formInline}>
              <div style={styles.campo}>
                <label style={styles.label}>Valor total do pedido (R$)</label>
                <p style={styles.dica}>O valor abaixo foi calculado com base no total dos pedidos das igrejas. Ajuste se necessário.</p>
                <input type="number" step="0.01" value={formPedido.valor_total} onChange={e => setFormPedido({ valor_total: e.target.value })} style={{ ...styles.input, maxWidth: '300px' }} />
              </div>
              <div style={styles.botoesForm}>
                <button onClick={() => setCriandoPedido(false)} style={styles.botaoCancelar}>Cancelar</button>
                <button onClick={criarPedido} disabled={salvando} style={styles.botaoSalvar}>{salvando ? 'Salvando...' : 'Registrar'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COM PEDIDO */}
      {!carregando && pedido && (
        <>
          {/* BALANCETE */}
          <div style={styles.balancete}>
            <div style={{ ...styles.balCard, borderTop: '4px solid #1a3a5c' }}>
              <span style={styles.balLabel}>Valor total do pedido</span>
              <span style={styles.balValor}>R$ {formatarValor(pedido.valor_total)}</span>
            </div>
            <div style={{ ...styles.balCard, borderTop: '4px solid #059669' }}>
              <span style={styles.balLabel}>Total pago</span>
              <span style={{ ...styles.balValor, color: '#059669' }}>R$ {formatarValor(totalPago)}</span>
            </div>
            <div style={{ ...styles.balCard, borderTop: '4px solid #dc2626' }}>
              <span style={styles.balLabel}>Saldo devedor</span>
              <span style={{ ...styles.balValor, color: saldoDevedor > 0 ? '#dc2626' : '#059669' }}>
                R$ {formatarValor(saldoDevedor)}
              </span>
            </div>
            <div style={{ ...styles.balCard, borderTop: '4px solid #888' }}>
              <span style={styles.balLabel}>Parcelas pagas</span>
              <span style={styles.balValor}>{parcelas.filter(p => p.pago).length} / {parcelas.length}</span>
            </div>
          </div>

          {/* PARCELAS */}
          <div style={styles.card}>
            <div style={styles.cardCabecalho}>
              <h3 style={styles.cardTitulo}>Parcelas à Editora</h3>
              <button onClick={() => setAdicionandoParcela(true)} style={styles.botaoNovoPequeno}>+ Adicionar Parcela</button>
            </div>

            {adicionandoParcela && (
              <div style={styles.formInline}>
                <div style={styles.grid3}>
                  <div style={styles.campo}>
                    <label style={styles.label}>Valor (R$)</label>
                    <input type="number" step="0.01" value={formParcela.valor} onChange={e => setFormParcela(f => ({ ...f, valor: e.target.value }))} style={styles.input} placeholder="0,00" />
                  </div>
                  <div style={styles.campo}>
                    <label style={styles.label}>Vencimento</label>
                    <input type="date" value={formParcela.vencimento} onChange={e => setFormParcela(f => ({ ...f, vencimento: e.target.value }))} style={styles.input} />
                  </div>
                </div>
                <div style={styles.botoesForm}>
                  <button onClick={() => setAdicionandoParcela(false)} style={styles.botaoCancelar}>Cancelar</button>
                  <button onClick={adicionarParcela} disabled={salvando} style={styles.botaoSalvar}>{salvando ? '...' : 'Adicionar'}</button>
                </div>
              </div>
            )}

            {parcelas.length === 0 && <p style={{ color: '#999', fontSize: '14px', padding: '12px 0' }}>Nenhuma parcela cadastrada ainda.</p>}

            <div style={styles.parcelasLista}>
              {parcelas.map(p => (
                <div key={p.id} style={p.pago ? styles.parcelaQuitada : styles.parcelaPendente}>
                  <div style={styles.parcelaNumero}>Parcela {p.numero_parcela}</div>
                  <div style={styles.parcelaValor}>R$ {formatarValor(p.valor)}</div>
                  {p.vencimento && <div style={styles.parcelaVenc}>Vence: {formatarData(p.vencimento)}</div>}
                  {p.pago ? (
                    <div style={styles.parcelaPagoInfo}>
                      ✓ Pago em {formatarData(p.data_pagamento)}
                      <button onClick={() => desfazerPagamento(p)} style={styles.miniBotao}>↩ Desfazer</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setPagando(p); setFormPag({ data_pagamento: hoje(), valor: Number(p.valor).toFixed(2) }) }} style={styles.botaoPagar}>$ Registrar Pagamento</button>
                      <button onClick={() => excluirParcela(p)} style={styles.miniBotaoExcluir} title="Excluir parcela">🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {parcelas.length > 0 && (
              <div style={styles.totalParcelas}>
                Total das parcelas: <strong>R$ {formatarValor(totalParcelas)}</strong>
                {Math.abs(totalParcelas - Number(pedido.valor_total)) > 0.01 && (
                  <span style={styles.aviso}> ⚠ Diferença de R$ {formatarValor(Math.abs(totalParcelas - Number(pedido.valor_total)))} em relação ao total do pedido</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', marginBottom: '20px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  seletorBox: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap', display: 'block', marginBottom: '6px' },
  select: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  badgeAberto: { backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeFechado: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap' },
  balancete: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' },
  balCard: { backgroundColor: '#fff', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '6px' },
  balLabel: { fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  balValor: { fontSize: '20px', fontWeight: '700', color: '#1a3a5c' },
  card: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px' },
  cardCabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitulo: { fontSize: '16px', fontWeight: '700', color: '#1a3a5c', margin: 0 },
  botaoNovo: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoNovoPequeno: { padding: '7px 16px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
  formInline: { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  campo: { marginBottom: '12px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  dica: { fontSize: '12px', color: '#888', marginBottom: '6px', fontStyle: 'italic' },
  botoesForm: { display: 'flex', gap: '10px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '9px 24px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  parcelasLista: { display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' },
  parcelaPendente: { backgroundColor: '#fff8f0', border: '1px solid #fed7aa', borderRadius: '10px', padding: '16px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px' },
  parcelaQuitada: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '6px' },
  parcelaNumero: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  parcelaValor: { fontSize: '18px', fontWeight: '700', color: '#1a3a5c' },
  parcelaVenc: { fontSize: '12px', color: '#666' },
  parcelaPagoInfo: { fontSize: '12px', color: '#059669', fontWeight: '600', display: 'flex', flexDirection: 'column', gap: '4px' },
  botaoPagar: { padding: '6px 12px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', alignSelf: 'flex-start' },
  miniBotao: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: 0, textAlign: 'left' },
  miniBotaoExcluir: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' },
  totalParcelas: { fontSize: '13px', color: '#555', borderTop: '1px solid #e5e7eb', paddingTop: '12px' },
  aviso: { color: '#b45309' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { backgroundColor: '#1a3a5c', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { color: '#fff', fontSize: '16px', fontWeight: '700', margin: 0 },
  modalFechar: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  modalCorpo: { padding: '24px' },
  modalBotoes: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' },
  botaoConfirmar: { padding: '9px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}
