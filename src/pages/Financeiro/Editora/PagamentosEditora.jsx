import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Alerta from '../../../components/Alerta'

export default function PagamentosEditora() {
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSel, setTrimestreSel] = useState('')
  const [pedido, setPedido] = useState(null)
  const [parcelas, setParcelas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [alerta, setAlerta] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [formParcela, setFormParcela] = useState({ valor: '', vencimento: '' })
  const [pagando, setPagando] = useState(null)
  const [formPag, setFormPag] = useState({ data_pagamento: hoje(), valor: '' })

  function hoje() { return new Date().toISOString().split('T')[0] }
  function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
  function fmtData(iso) { if (!iso) return '—'; return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') }
  const numeroLabel = n => ['I', 'II', 'III', 'IV'][n - 1]
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
    } else { setParcelas([]) }
    setCarregando(false)
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
    setAdicionando(false)
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
    setMensagem(`Parcela ${pagando.numero_parcela} registrada!`)
    setTimeout(() => setMensagem(''), 3000)
    carregarDados()
  }

  async function desfazer(parcela) {
    setAlerta({
      titulo: 'Desfazer pagamento?',
      mensagem: `Desfazer o pagamento da parcela ${parcela.numero_parcela}?`,
      tipo: 'aviso', textoBotao: 'Sim, desfazer',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('parcelas_editora').update({ pago: false, data_pagamento: null }).eq('id', parcela.id)
        setAlerta(null); carregarDados()
      },
    })
  }

  async function excluir(parcela) {
    if (parcela.pago) return
    setAlerta({
      titulo: 'Excluir parcela?',
      mensagem: `Excluir a parcela ${parcela.numero_parcela}?`,
      tipo: 'perigo', textoBotao: 'Sim, excluir',
      onCancelar: () => setAlerta(null),
      onConfirmar: async () => {
        await supabase.from('parcelas_editora').delete().eq('id', parcela.id)
        setAlerta(null); carregarDados()
      },
    })
  }

  const totalPago = parcelas.filter(p => p.pago).reduce((s, p) => s + Number(p.valor), 0)
  const saldo = Number(pedido?.valor_total || 0) - totalPago

  return (
    <div style={s.container}>
      {alerta && <Alerta {...alerta} />}

      {pagando && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>Registrar Pagamento — Parcela {pagando.numero_parcela}</h3>
              <button onClick={() => setPagando(null)} style={s.modalFechar}>✕</button>
            </div>
            <div style={s.modalCorpo}>
              <div style={s.campo}>
                <label style={s.label}>Data do pagamento</label>
                <input type="date" value={formPag.data_pagamento} onChange={e => setFormPag(f => ({ ...f, data_pagamento: e.target.value }))} style={s.input} />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Valor pago (R$)</label>
                <input type="number" step="0.01" value={formPag.valor} onChange={e => setFormPag(f => ({ ...f, valor: e.target.value }))} style={s.input} />
              </div>
              <div style={s.modalBotoes}>
                <button onClick={() => setPagando(null)} style={s.botaoCancelar}>Cancelar</button>
                <button onClick={salvarPagamento} disabled={salvando} style={s.botaoConfirmar}>{salvando ? '...' : '✓ Confirmar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 style={s.titulo}>Pagamentos à Editora</h2>
      {mensagem && <div style={s.sucesso}>{mensagem}</div>}

      <div style={s.seletorBox}>
        <label style={s.label}>Trimestre</label>
        <select value={trimestreSel} onChange={e => setTrimestreSel(e.target.value)} style={s.select}>
          {trimestres.map(t => <option key={t.id} value={t.id}>{numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}</option>)}
        </select>
        <span style={trimestreAtual?.status === 'aberto' ? s.badgeAberto : s.badgeFechado}>
          {trimestreAtual?.status === 'aberto' ? '● Aberto' : '■ Fechado'}
        </span>
      </div>

      {carregando && <div style={s.vazio}>Carregando...</div>}

      {!carregando && !pedido && (
        <div style={s.card}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Nenhum pedido à editora encontrado para este trimestre. Crie o pedido na aba <strong>Pedido</strong> primeiro.
          </p>
        </div>
      )}

      {!carregando && pedido && (
        <>
          <div style={s.balancete}>
            <div style={{ ...s.balCard, borderTop: '4px solid #1a3a5c' }}>
              <span style={s.balLabel}>Total líquido do pedido</span>
              <span style={s.balValor}>R$ {fmt(pedido.valor_total)}</span>
            </div>
            <div style={{ ...s.balCard, borderTop: '4px solid #059669' }}>
              <span style={s.balLabel}>Total pago</span>
              <span style={{ ...s.balValor, color: '#059669' }}>R$ {fmt(totalPago)}</span>
            </div>
            <div style={{ ...s.balCard, borderTop: '4px solid #dc2626' }}>
              <span style={s.balLabel}>Saldo devedor</span>
              <span style={{ ...s.balValor, color: saldo > 0 ? '#dc2626' : '#059669' }}>R$ {fmt(saldo)}</span>
            </div>
            <div style={{ ...s.balCard, borderTop: '4px solid #888' }}>
              <span style={s.balLabel}>Parcelas pagas</span>
              <span style={s.balValor}>{parcelas.filter(p => p.pago).length} / {parcelas.length}</span>
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={s.cardTitulo}>Parcelas</h3>
              <button onClick={() => setAdicionando(true)} style={s.botaoNovo}>+ Adicionar Parcela</button>
            </div>

            {adicionando && (
              <div style={s.formInline}>
                <div style={s.grid2}>
                  <div style={s.campo}>
                    <label style={s.label}>Valor (R$)</label>
                    <input type="number" step="0.01" value={formParcela.valor} onChange={e => setFormParcela(f => ({ ...f, valor: e.target.value }))} style={s.input} placeholder="0,00" />
                  </div>
                  <div style={s.campo}>
                    <label style={s.label}>Vencimento</label>
                    <input type="date" value={formParcela.vencimento} onChange={e => setFormParcela(f => ({ ...f, vencimento: e.target.value }))} style={s.input} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setAdicionando(false)} style={s.botaoCancelar}>Cancelar</button>
                  <button onClick={adicionarParcela} disabled={salvando} style={s.botaoSalvar}>{salvando ? '...' : 'Adicionar'}</button>
                </div>
              </div>
            )}

            <div style={s.parcelasGrid}>
              {parcelas.length === 0 && <p style={{ color: '#999', fontSize: '14px' }}>Nenhuma parcela cadastrada.</p>}
              {parcelas.map(p => (
                <div key={p.id} style={p.pago ? s.parcelaOk : s.parcelaPend}>
                  <div style={s.parcelaNum}>Parcela {p.numero_parcela}</div>
                  <div style={s.parcelaVal}>R$ {fmt(p.valor)}</div>
                  {p.vencimento && <div style={s.parcelaVenc}>Vence: {fmtData(p.vencimento)}</div>}
                  {p.pago ? (
                    <>
                      <div style={s.parcelaPagoInfo}>✓ Pago em {fmtData(p.data_pagamento)}</div>
                      <button onClick={() => desfazer(p)} style={s.miniBotao}>↩ Desfazer</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button onClick={() => { setPagando(p); setFormPag({ data_pagamento: hoje(), valor: Number(p.valor).toFixed(2) }) }} style={s.botaoPagar}>$ Pagar</button>
                      <button onClick={() => excluir(p)} style={s.miniBotaoExcluir} title="Excluir">🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
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
  balValor: { fontSize: '18px', fontWeight: '700', color: '#1a3a5c' },
  card: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px' },
  cardTitulo: { fontSize: '16px', fontWeight: '700', color: '#1a3a5c', margin: 0 },
  botaoNovo: { padding: '7px 16px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
  formInline: { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  campo: { marginBottom: '12px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  botaoCancelar: { padding: '8px 18px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '8px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  parcelasGrid: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  parcelaPend: { backgroundColor: '#fff8f0', border: '1px solid #fed7aa', borderRadius: '10px', padding: '16px', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '5px' },
  parcelaOk: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '5px' },
  parcelaNum: { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  parcelaVal: { fontSize: '18px', fontWeight: '700', color: '#1a3a5c' },
  parcelaVenc: { fontSize: '12px', color: '#666' },
  parcelaPagoInfo: { fontSize: '12px', color: '#059669', fontWeight: '600' },
  botaoPagar: { padding: '5px 12px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  miniBotao: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: 0 },
  miniBotaoExcluir: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { backgroundColor: '#1a3a5c', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0 },
  modalFechar: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  modalCorpo: { padding: '24px' },
  modalBotoes: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' },
  botaoConfirmar: { padding: '9px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}
