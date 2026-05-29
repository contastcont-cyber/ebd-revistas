import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function PedidoEditora() {
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSel, setTrimestreSel] = useState('')
  const [config, setConfig] = useState(null)
  const [pedido, setPedido] = useState(null)
  const [itens, setItens] = useState([]) // { revista_id, codigo_editora, descricao, quantidade, valor_unitario_custo }
  const [todasRevistas, setTodasRevistas] = useState([])
  const [desconto, setDesconto] = useState(50)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const printRef = useRef()
  // Ordenação
  const [sortCol, setSortCol] = useState(null) // 'codigo_editora'|'descricao'|'quantidade'|'valor_unitario_custo'|'total'
  const [sortDir, setSortDir] = useState('asc')
  // Drag and drop
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const numeroLabel = n => ['I', 'II', 'III', 'IV'][n - 1]
  const fmt = v => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const hoje = () => new Date().toLocaleDateString('pt-BR')
  const trimestreAtual = trimestres.find(t => t.id === trimestreSel)

  useEffect(() => { carregarBase() }, [])
  useEffect(() => { if (trimestreSel) carregarPedido() }, [trimestreSel])

  async function carregarBase() {
    const [{ data: trims }, { data: revs }, { data: cfg }] = await Promise.all([
      supabase.from('trimestres').select('*').order('ano', { ascending: false }).order('numero', { ascending: false }),
      supabase.from('revistas').select('*, tipos_revista(codigo, descricao)').eq('ativo', true).order('codigo'),
      supabase.from('config_editora').select('*').limit(1).single(),
    ])
    setTrimestres(trims || [])
    setTodasRevistas(revs || [])
    setConfig(cfg)
    if (cfg) setDesconto(cfg.desconto_percentual || 50)
    const aberto = (trims || []).find(t => t.status === 'aberto') || (trims || [])[0]
    if (aberto) setTrimestreSel(aberto.id)
  }

  async function carregarPedido() {
    setCarregando(true)
    const { data: ped } = await supabase
      .from('pedido_editora')
      .select('*')
      .eq('trimestre_id', trimestreSel)
      .single()

    if (ped) {
      setPedido(ped)
      setDesconto(ped.desconto_percentual || config?.desconto_percentual || 50)
      const { data: itensData } = await supabase
        .from('itens_pedido_editora')
        .select('*, revistas(codigo_editora)')
        .eq('pedido_editora_id', ped.id)
        .order('descricao')
      // Sempre usa o codigo_editora atual da revista cadastrada
      setItens((itensData || []).map(i => ({
        ...i,
        codigo_editora: i.revistas?.codigo_editora || i.codigo_editora || '',
      })))
    } else {
      setPedido(null)
      setItens([])
    }
    setCarregando(false)
  }

  async function criarPedidoVazio() {
    // Monta itens com todas as revistas ativas, quantidade 0, custo 0
    const novosItens = todasRevistas.map(r => ({
      revista_id: r.id,
      codigo_editora: r.codigo_editora || '',
      descricao: r.nome,
      quantidade: 0,
      valor_unitario_custo: 0,
    }))
    setItens(novosItens)
    await salvarPedido(novosItens)
  }

  async function copiarTrimstreAnterior() {
    const anoAnt = trimestreAtual.numero === 1 ? trimestreAtual.ano - 1 : trimestreAtual.ano
    const numAnt = trimestreAtual.numero === 1 ? 4 : trimestreAtual.numero - 1
    const { data: trimAnt } = await supabase.from('trimestres').select('id').eq('ano', anoAnt).eq('numero', numAnt).single()
    if (!trimAnt) { setErro('Não há trimestre anterior cadastrado.'); return }
    const { data: pedAnt } = await supabase.from('pedido_editora').select('id, desconto_percentual').eq('trimestre_id', trimAnt.id).single()
    if (!pedAnt) { setErro('Não há pedido cadastrado no trimestre anterior.'); return }
    const { data: itensAnt } = await supabase.from('itens_pedido_editora').select('*').eq('pedido_editora_id', pedAnt.id)

    // Merge: itens do trimestre anterior + revistas novas sem item
    const idsComItem = new Set((itensAnt || []).map(i => i.revista_id))
    const itensCopiad = (itensAnt || []).map(i => ({
      revista_id: i.revista_id,
      codigo_editora: i.codigo_editora,
      descricao: i.descricao,
      quantidade: i.quantidade,
      valor_unitario_custo: i.valor_unitario_custo,
    }))
    const itensNovos = todasRevistas.filter(r => !idsComItem.has(r.id)).map(r => ({
      revista_id: r.id,
      codigo_editora: r.codigo_editora || '',
      descricao: r.nome,
      quantidade: 0,
      valor_unitario_custo: 0,
    }))
    const todos = [...itensCopiad, ...itensNovos].sort((a, b) => a.descricao.localeCompare(b.descricao))
    setItens(todos)
    setDesconto(pedAnt.desconto_percentual || desconto)
    await salvarPedido(todos, pedAnt.desconto_percentual || desconto)
    setMensagem('Pedido copiado do trimestre anterior! Revise as quantidades e preços.')
    setTimeout(() => setMensagem(''), 4000)
  }

  function setItemValor(idx, campo, valor) {
    setItens(its => its.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  function adicionarTodas() {
    const novas = revistasSemItem.map(r => ({
      revista_id: r.id,
      codigo_editora: r.codigo_editora || '',
      descricao: r.nome,
      quantidade: 0,
      valor_unitario_custo: 0,
    }))
    setItens(its => [...its, ...novas].sort((a, b) => a.descricao.localeCompare(b.descricao)))
  }

  function adicionarRevista(revId) {
    const rev = todasRevistas.find(r => r.id === revId)
    if (!rev || itens.find(i => i.revista_id === revId)) return
    setItens(its => [...its, {
      revista_id: rev.id,
      codigo_editora: rev.codigo_editora || '',
      descricao: rev.nome,
      quantidade: 0,
      valor_unitario_custo: 0,
    }].sort((a, b) => a.descricao.localeCompare(b.descricao)))
  }

  function removerItem(idx) {
    setItens(its => its.filter((_, i) => i !== idx))
  }

  // Ordenação por coluna
  function toggleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortCol(null); setSortDir('asc') }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function getItensVisiveis() {
    if (!sortCol) return itens
    return [...itens].sort((a, b) => {
      let va, vb
      if (sortCol === 'total') {
        va = Number(a.quantidade) * Number(a.valor_unitario_custo)
        vb = Number(b.quantidade) * Number(b.valor_unitario_custo)
      } else if (sortCol === 'quantidade' || sortCol === 'valor_unitario_custo') {
        va = Number(a[sortCol]); vb = Number(b[sortCol])
      } else {
        va = (a[sortCol] || '').toLowerCase(); vb = (b[sortCol] || '').toLowerCase()
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  function onDragStart(idx) { if (sortCol) return; setDragIdx(idx) }
  function onDragOver(e, idx) { e.preventDefault(); if (sortCol) return; setDragOverIdx(idx) }
  function onDrop(idx) {
    if (dragIdx === null || dragIdx === idx || sortCol) { setDragIdx(null); setDragOverIdx(null); return }
    const nova = [...itens]
    const [moved] = nova.splice(dragIdx, 1)
    nova.splice(idx, 0, moved)
    setItens(nova)
    setDragIdx(null); setDragOverIdx(null)
  }

  function seta(col) {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  // Cálculos
  const arred = v => Math.round(v * 100) / 100
  const subTotal = arred(itens.reduce((s, i) => s + (Number(i.quantidade) * Number(i.valor_unitario_custo)), 0))
  const valorDesconto = arred(subTotal * (desconto / 100))
  const totalLiquido = arred(subTotal - valorDesconto)
  const totalQtd = itens.reduce((s, i) => s + Number(i.quantidade || 0), 0)

  async function salvarPedido(itensParam, descontoParam) {
    const its = itensParam || itens
    const desc = descontoParam ?? desconto
    const sub = its.reduce((s, i) => s + (Number(i.quantidade) * Number(i.valor_unitario_custo)), 0)
    const vDesc = sub * (desc / 100)
    const total = sub - vDesc

    setSalvando(true)
    setErro('')
    let pedidoId = pedido?.id

    if (!pedidoId) {
      const { data: novo, error } = await supabase.from('pedido_editora').insert({
        trimestre_id: trimestreSel,
        desconto_percentual: desc,
        valor_subtotal: sub,
        valor_desconto: vDesc,
        valor_total: total,
      }).select().single()
      if (error) { setErro('Erro ao criar pedido: ' + error.message); setSalvando(false); return }
      pedidoId = novo.id
      setPedido(novo)
    } else {
      await supabase.from('pedido_editora').update({
        desconto_percentual: desc,
        valor_subtotal: sub,
        valor_desconto: vDesc,
        valor_total: total,
      }).eq('id', pedidoId)
    }

    // Salva itens
    await supabase.from('itens_pedido_editora').delete().eq('pedido_editora_id', pedidoId)
    const itensParaSalvar = its
      .filter(i => Number(i.quantidade) > 0 || Number(i.valor_unitario_custo) > 0)
      .map(i => ({
        pedido_editora_id: pedidoId,
        revista_id: i.revista_id,
        codigo_editora: i.codigo_editora,
        descricao: i.descricao,
        quantidade: Number(i.quantidade) || 0,
        valor_unitario_custo: Number(i.valor_unitario_custo) || 0,
      }))
    if (itensParaSalvar.length > 0) {
      await supabase.from('itens_pedido_editora').insert(itensParaSalvar)
    }

    setSalvando(false)
    if (!itensParam) {
      setMensagem('Pedido salvo com sucesso!')
      setTimeout(() => setMensagem(''), 3000)
      carregarPedido()
    }
  }

  function exportarExcel() {
    const header = [
      [`PEDIDO ${numeroLabel(trimestreAtual?.numero)} – TRIMESTRE ${trimestreAtual?.ano}`, '', '', config?.codigo_local || '', hoje()],
      ['CLIENTE:', config?.nome_cliente || ''],
      ['ENDEREÇO:', config?.endereco || ''],
      ['FORMA DE ENVIO:', config?.forma_envio || ''],
      ['CONTATO:', config?.contato || ''],
      ['COND. PAGAMENTO:', config?.cond_pagamento || ''],
      [],
      ['QT', 'CÓD', 'DESCRIÇÃO', 'VLr UNI', 'TOTAL'],
    ]
    const linhas = itens.filter(i => Number(i.quantidade) > 0).map(i => [
      Number(i.quantidade),
      i.codigo_editora || '',
      i.descricao,
      Number(i.valor_unitario_custo),
      Number(i.quantidade) * Number(i.valor_unitario_custo),
    ])
    const rodape = [
      [totalQtd, '', '', 'SUB TOTAL', subTotal],
      ['', '', '', `DESCONTO ${desconto}%`, -valorDesconto],
      ['', '', '', 'TOTAL LÍQUIDO', totalLiquido],
    ]
    const dados = [...header, ...linhas, [], ...rodape]
    const ws = XLSX.utils.aoa_to_sheet(dados)
    ws['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 50 }, { wch: 12 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf], { type: 'application/octet-stream' }),
      `Pedido_Editora_${numeroLabel(trimestreAtual?.numero)}_Trim_${trimestreAtual?.ano}.xlsx`)
  }

  function imprimirPDF() { window.print() }

  const revistasSemItem = todasRevistas.filter(r => !itens.find(i => i.revista_id === r.id))

  if (carregando) return <div style={s.vazio}>Carregando...</div>

  return (
    <div style={s.container}>
      {/* Print CSS */}
      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          #area-impressao, #area-impressao * { visibility: visible; }
          #area-impressao { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-only { display: inline !important; }
        }
      `}</style>

      <div className="no-print">
        {mensagem && <div style={s.sucesso}>{mensagem}</div>}
        {erro && <div style={s.erroBox}>{erro}</div>}

        {/* SELETOR */}
        <div style={s.seletorBox}>
          <label style={s.label}>Trimestre</label>
          <select value={trimestreSel} onChange={e => setTrimestreSel(e.target.value)} style={s.select}>
            {trimestres.map(t => (
              <option key={t.id} value={t.id}>{numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}</option>
            ))}
          </select>
          <span style={trimestreAtual?.status === 'aberto' ? s.badgeAberto : s.badgeFechado}>
            {trimestreAtual?.status === 'aberto' ? '● Aberto' : '■ Fechado'}
          </span>
        </div>

        {/* SEM PEDIDO */}
        {!pedido && (
          <div style={s.card}>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Nenhum pedido à editora para este trimestre.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={criarPedidoVazio} style={s.botaoNovo}>+ Criar Novo Pedido</button>
              <button onClick={copiarTrimstreAnterior} style={s.botaoSecundario}>⬆ Copiar do Trimestre Anterior</button>
            </div>
          </div>
        )}
      </div>

      {/* PEDIDO */}
      {pedido && (
        <>
          {/* BARRA DE AÇÕES */}
          <div className="no-print" style={s.barraAcoes}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={copiarTrimstreAnterior} style={s.botaoSecundario}>⬆ Copiar do Trimestre Anterior</button>
              <span style={s.separador}>|</span>
              {revistasSemItem.length > 0 && (
                <>
                  <select onChange={e => { if (e.target.value) adicionarRevista(e.target.value); e.target.value = '' }} style={s.selectAdicionar}>
                    <option value="">+ Adicionar revista ao pedido...</option>
                    {revistasSemItem.map(r => <option key={r.id} value={r.id}>{r.codigo} — {r.nome}</option>)}
                  </select>
                  <button onClick={adicionarTodas} style={s.botaoAdicionarTodas}>
                    + Adicionar Todas ({revistasSemItem.length})
                  </button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={imprimirPDF} style={s.botaoPDF}>🖨 Imprimir / PDF</button>
              <button onClick={exportarExcel} style={s.botaoExcel}>📊 Exportar Excel</button>
              <button onClick={() => salvarPedido()} disabled={salvando} style={s.botaoSalvar}>
                {salvando ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>

          {/* ÁREA DE IMPRESSÃO */}
          <div id="area-impressao" ref={printRef}>

            {/* CABEÇALHO */}
            <div style={s.cabecalhoPedido}>
              <div style={s.cabTitle}>
                <strong>PEDIDO {numeroLabel(trimestreAtual?.numero)} – TRIMESTRE {trimestreAtual?.ano}</strong>
                <span style={s.cabSep}>{config?.codigo_local || 'GYN'}</span>
                <span>{hoje()}</span>
              </div>
              <div style={s.cabGrid}>
                <div style={s.cabLinha}><span style={s.cabKey}>CLIENTE</span><span style={s.cabVal}>{config?.nome_cliente}</span></div>
                <div style={s.cabLinha}><span style={s.cabKey}>ENDEREÇO</span><span style={s.cabVal}>{config?.endereco}</span></div>
                <div style={s.cabGrid2}>
                  <div style={s.cabLinha}><span style={s.cabKey}>FORMA DE ENVIO</span><span style={s.cabVal}>{config?.forma_envio}</span></div>
                  <div style={s.cabLinha}><span style={s.cabKey}>CONTATO</span><span style={s.cabVal}>{config?.contato}</span></div>
                </div>
                <div style={s.cabLinha}><span style={s.cabKey}>COND. PAGAMENTO</span><span style={s.cabVal}>{config?.cond_pagamento}</span></div>
              </div>
            </div>

            {/* TABELA */}
            <div style={s.tabelaWrap}>
              {/* CABEÇALHO FIXO COM ORDENAÇÃO */}
              <div style={s.tabelaHeader}>
                <span className="no-print" style={{ width: '24px' }}></span>
                <span onClick={() => toggleSort('codigo_editora')} style={s.thClick}>CÓD{seta('codigo_editora')}</span>
                <span onClick={() => toggleSort('descricao')} style={{ ...s.thClick, flex: 1 }}>DESCRIÇÃO DO PEDIDO{seta('descricao')}</span>
                <span onClick={() => toggleSort('quantidade')} style={{ ...s.thClick, width: '80px', textAlign: 'center' }}>QT{seta('quantidade')}</span>
                <span onClick={() => toggleSort('valor_unitario_custo')} style={{ ...s.thClick, width: '110px', textAlign: 'right' }}>VLr UNI{seta('valor_unitario_custo')}</span>
                <span onClick={() => toggleSort('total')} style={{ ...s.thClick, width: '120px', textAlign: 'right' }}>TOTAL{seta('total')}</span>
                <span className="no-print" style={{ width: '40px' }}></span>
              </div>

              {/* LINHAS ROLÁVEIS */}
              <div style={s.tabelaCorpo}>
                {sortCol === null && (
                  <div style={s.dragHint}>⠿ Arraste as linhas para reordenar — clique nos títulos das colunas para ordenar</div>
                )}
                {sortCol !== null && (
                  <div style={s.sortHint}>
                    Ordenando por <strong>{sortCol}</strong> {sortDir === 'asc' ? '▲' : '▼'} —
                    <button onClick={() => setSortCol(null)} style={s.limparSort}>Voltar à ordem personalizada</button>
                  </div>
                )}
                {getItensVisiveis().map((item, visIdx) => {
                  const realIdx = itens.indexOf(item)
                  const isDragging = dragIdx === realIdx
                  const isDragOver = dragOverIdx === realIdx
                  return (
                    <div
                      key={visIdx}
                      draggable={!sortCol}
                      onDragStart={() => onDragStart(realIdx)}
                      onDragOver={e => onDragOver(e, realIdx)}
                      onDrop={() => onDrop(realIdx)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                      style={{
                        ...s.tabelaLinha,
                        backgroundColor: isDragging ? '#e0f0ff' : isDragOver ? '#f0fdf4' : Number(item.quantidade) > 0 ? '#fff' : '#fafafa',
                        borderTop: isDragOver ? '2px solid #059669' : undefined,
                        opacity: isDragging ? 0.5 : 1,
                        cursor: sortCol ? 'default' : 'grab',
                      }}
                    >
                      <span className="no-print" style={{ width: '24px', color: '#ccc', fontSize: '16px', cursor: sortCol ? 'default' : 'grab', userSelect: 'none' }}>
                        {!sortCol && '⠿'}
                      </span>
                      <span style={{ width: '80px', textAlign: 'center', fontSize: '13px', color: '#444' }}>
                        {item.codigo_editora || '—'}
                      </span>
                      <span style={{ flex: 1, fontSize: '13px' }}>{item.descricao}</span>
                      <span style={{ width: '80px', textAlign: 'center' }}>
                        <input
                          className="no-print"
                          type="number" min="0"
                          value={item.quantidade}
                          onChange={e => setItemValor(realIdx, 'quantidade', e.target.value)}
                          style={s.inputQtd}
                          onMouseDown={e => e.stopPropagation()}
                        />
                        <span className="print-only">{item.quantidade || ''}</span>
                      </span>
                      <span style={{ width: '110px', textAlign: 'right' }}>
                        <input
                          className="no-print"
                          type="number" min="0" step="0.01"
                          value={item.valor_unitario_custo}
                          onChange={e => setItemValor(realIdx, 'valor_unitario_custo', e.target.value)}
                          style={s.inputPreco}
                          onMouseDown={e => e.stopPropagation()}
                        />
                        <span className="print-only">{Number(item.valor_unitario_custo) > 0 ? fmt(item.valor_unitario_custo) : ''}</span>
                      </span>
                      <span style={{ width: '120px', textAlign: 'right', fontWeight: Number(item.quantidade) > 0 ? '600' : '400', color: Number(item.quantidade) > 0 ? '#1a3a5c' : '#ccc' }}>
                        {Number(item.quantidade) > 0 ? `R$ ${fmt(Number(item.quantidade) * Number(item.valor_unitario_custo))}` : '—'}
                      </span>
                      <span className="no-print" style={{ width: '40px', textAlign: 'center' }}>
                        <button onClick={() => removerItem(realIdx)} style={s.botaoRemover} title="Remover do pedido">✕</button>
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* TOTAIS */}
              <div style={s.totaisWrap}>
                <div style={s.totalLinha}>
                  <span style={s.totalKey}>{totalQtd} unidades</span>
                  <span style={s.totalKey}>SUB TOTAL</span>
                  <span style={s.totalVal}>R$ {fmt(subTotal)}</span>
                </div>
                <div style={s.totalLinha}>
                  <span></span>
                  <span style={s.totalKey}>
                    DESCONTO
                    <input
                      className="no-print"
                      type="number" min="0" max="100" step="0.1"
                      value={desconto}
                      onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                      style={s.inputDesconto}
                    />
                    <span>%</span>
                  </span>
                  <span style={{ ...s.totalVal, color: '#dc2626' }}>- R$ {fmt(valorDesconto)}</span>
                </div>
                <div style={{ ...s.totalLinha, borderTop: '2px solid #1a3a5c', paddingTop: '10px' }}>
                  <span></span>
                  <span style={{ ...s.totalKey, fontSize: '16px', color: '#1a3a5c' }}>TOTAL LÍQUIDO</span>
                  <span style={{ ...s.totalVal, fontSize: '20px', color: '#1a3a5c' }}>R$ {fmt(totalLiquido)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  container: { padding: '28px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  erroBox: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  seletorBox: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' },
  select: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  badgeAberto: { backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeFechado: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap' },
  card: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px' },
  barraAcoes: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' },
  botaoNovo: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSecundario: { padding: '8px 16px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
  botaoSalvar: { padding: '9px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  botaoPDF: { padding: '9px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
  botaoExcel: { padding: '9px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
  separador: { color: '#d1d5db' },
  selectAdicionar: { padding: '8px 12px', border: '1px dashed #1a3a5c', borderRadius: '7px', fontSize: '13px', color: '#1a3a5c', backgroundColor: '#f0f9ff', cursor: 'pointer' },
  botaoAdicionarTodas: { padding: '8px 14px', backgroundColor: '#e0f0ff', color: '#1a3a5c', border: '1px solid #93c5fd', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
  // Cabeçalho do pedido (estilo planilha)
  cabecalhoPedido: { backgroundColor: '#fff', border: '2px solid #1a3a5c', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' },
  cabTitle: { backgroundColor: '#1a3a5c', color: '#fff', padding: '12px 20px', display: 'flex', gap: '24px', alignItems: 'center', fontSize: '15px', fontWeight: '700' },
  cabSep: { backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 12px', borderRadius: '4px' },
  cabGrid: { padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  cabGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  cabLinha: { display: 'flex', gap: '12px', alignItems: 'baseline', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' },
  cabKey: { fontSize: '11px', fontWeight: '700', color: '#1a3a5c', minWidth: '140px', textTransform: 'uppercase' },
  cabVal: { fontSize: '13px', color: '#333' },
  // Tabela
  tabelaWrap: { backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' },
  tabelaHeader: { display: 'flex', padding: '10px 16px', backgroundColor: '#1a3a5c', color: '#fff', fontSize: '12px', fontWeight: '700', gap: '8px', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2 },
  tabelaCorpo: { overflowY: 'auto', maxHeight: '420px' },
  tabelaLinha: { display: 'flex', padding: '7px 16px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', gap: '8px', fontSize: '13px' },
  thClick: { cursor: 'pointer', userSelect: 'none', width: '80px', textAlign: 'center', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.1s' },
  dragHint: { fontSize: '11px', color: '#aaa', padding: '4px 16px', fontStyle: 'italic', backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' },
  sortHint: { fontSize: '12px', color: '#555', padding: '5px 16px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #e0f0ff', display: 'flex', alignItems: 'center', gap: '8px' },
  limparSort: { background: 'none', border: 'none', color: '#1a3a5c', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', padding: 0 },
  inputQtd: { width: '60px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '13px', textAlign: 'center' },
  inputCod: { width: '70px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '12px', textAlign: 'center' },
  inputPreco: { width: '90px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '13px', textAlign: 'right' },
  botaoRemover: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px', opacity: 0.5, padding: '2px 6px' },
  totaisWrap: { padding: '16px 20px', backgroundColor: '#f8fafc', borderTop: '2px solid #e5e7eb' },
  totalLinha: { display: 'flex', justifyContent: 'flex-end', gap: '24px', alignItems: 'center', paddingBottom: '8px' },
  totalKey: { fontSize: '14px', fontWeight: '600', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' },
  totalVal: { fontSize: '16px', fontWeight: '700', color: '#333', minWidth: '140px', textAlign: 'right' },
  inputDesconto: { width: '55px', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '5px', fontSize: '13px', textAlign: 'center' },
  vazio: { padding: '48px', textAlign: 'center', color: '#999' },
}
