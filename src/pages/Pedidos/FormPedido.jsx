import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function FormPedido({ igreja, pedidoExistente, trimestre, trimestreSel, onFechar }) {
  const [revistas, setRevistas] = useState([]) // { revista, preco, quantidade }
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]

  useEffect(() => { carregar() }, [])

  async function carregar() {
    // Busca revistas ativas com preço do trimestre
    const { data: revData } = await supabase
      .from('revistas')
      .select('*, tipos_revista(codigo, descricao)')
      .eq('ativo', true)
      .order('codigo')

    const { data: precosData } = await supabase
      .from('precos_revistas')
      .select('*')
      .eq('trimestre_id', trimestreSel)

    const mapaPrecos = {}
    ;(precosData || []).forEach(p => { mapaPrecos[p.revista_id] = p.preco_unitario })

    // Se editando, busca quantidades existentes
    let mapaQtd = {}
    if (pedidoExistente) {
      const { data: itens } = await supabase
        .from('itens_pedido')
        .select('*')
        .eq('pedido_id', pedidoExistente.id)
      ;(itens || []).forEach(i => { mapaQtd[i.revista_id] = i.quantidade })
    } else {
      // Tenta buscar pedido do trimestre anterior como sugestão
      const anoAnt = trimestre.numero === 1 ? trimestre.ano - 1 : trimestre.ano
      const numAnt = trimestre.numero === 1 ? 4 : trimestre.numero - 1
      const { data: trimAnt } = await supabase
        .from('trimestres')
        .select('id')
        .eq('ano', anoAnt)
        .eq('numero', numAnt)
        .single()

      if (trimAnt) {
        const { data: pedAnt } = await supabase
          .from('pedidos_igrejas')
          .select('id')
          .eq('igreja_id', igreja.id)
          .eq('trimestre_id', trimAnt.id)
          .single()

        if (pedAnt) {
          const { data: itensAnt } = await supabase
            .from('itens_pedido')
            .select('*')
            .eq('pedido_id', pedAnt.id)
          ;(itensAnt || []).forEach(i => { mapaQtd[i.revista_id] = i.quantidade })
        }
      }
    }

    const lista = (revData || []).map(r => ({
      revista: r,
      preco: mapaPrecos[r.id] || null,
      quantidade: mapaQtd[r.id] || 0,
    }))

    setRevistas(lista)
    setCarregando(false)
  }

  function setQtd(revId, valor) {
    const qtd = Math.max(0, parseInt(valor) || 0)
    setRevistas(rs => rs.map(r => r.revista.id === revId ? { ...r, quantidade: qtd } : r))
  }

  const total = revistas.reduce((s, r) => s + (r.quantidade * (r.preco || 0)), 0)
  const semPreco = revistas.filter(r => r.quantidade > 0 && !r.preco)

  async function salvar() {
    if (semPreco.length > 0) {
      setErro(`Defina o preço das revistas antes de salvar: ${semPreco.map(r => r.revista.codigo).join(', ')}`)
      return
    }
    setSalvando(true)
    setErro('')

    let pedidoId = pedidoExistente?.id

    if (!pedidoId) {
      // Cria o pedido
      const { data: novoPedido, error } = await supabase
        .from('pedidos_igrejas')
        .insert({ igreja_id: igreja.id, trimestre_id: trimestreSel, valor_total: total })
        .select()
        .single()

      if (error) {
        setErro('Erro ao criar pedido: ' + error.message)
        setSalvando(false)
        return
      }
      pedidoId = novoPedido.id
    } else {
      // Atualiza valor total
      await supabase.from('pedidos_igrejas').update({ valor_total: total }).eq('id', pedidoId)
      // Remove itens antigos
      await supabase.from('itens_pedido').delete().eq('pedido_id', pedidoId)
    }

    // Insere itens (apenas os que têm quantidade > 0)
    const itens = revistas
      .filter(r => r.quantidade > 0)
      .map(r => ({
        pedido_id: pedidoId,
        revista_id: r.revista.id,
        quantidade: r.quantidade,
        valor_unitario: r.preco,
      }))

    if (itens.length > 0) {
      await supabase.from('itens_pedido').insert(itens)
    }

    // Cria parcelas automáticas (2 parcelas iguais)
    if (!pedidoExistente) {
      const valorParcela = total / 2
      await supabase.from('parcelas_igrejas').insert([
        { pedido_id: pedidoId, numero_parcela: 1, valor: valorParcela },
        { pedido_id: pedidoId, numero_parcela: 2, valor: valorParcela },
      ])
    } else {
      // Atualiza valor das parcelas se já existirem
      const { data: parcelas } = await supabase
        .from('parcelas_igrejas')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('numero_parcela')

      if (parcelas && parcelas.length > 0) {
        const valorParcela = total / parcelas.length
        for (const p of parcelas) {
          if (!p.pago) {
            await supabase.from('parcelas_igrejas').update({ valor: valorParcela }).eq('id', p.id)
          }
        }
      }
    }

    setSalvando(false)
    onFechar(true)
  }

  if (carregando) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>Carregando...</div>
  }

  const sugestao = !pedidoExistente && revistas.some(r => r.quantidade > 0)

  return (
    <div style={styles.container}>
      {/* CABEÇALHO */}
      <div style={styles.cabecalho}>
        <button onClick={() => onFechar(false)} style={styles.botaoVoltar}>← Voltar</button>
        <div>
          <h2 style={styles.titulo}>
            {pedidoExistente ? 'Editar Pedido' : 'Novo Pedido'}
          </h2>
          <p style={styles.subtitulo}>
            Igreja {igreja.codigo} — {igreja.nome} &nbsp;|&nbsp;
            {numeroLabel(trimestre?.numero)} Trimestre de {trimestre?.ano}
          </p>
        </div>
        <button onClick={salvar} disabled={salvando || total === 0} style={total > 0 ? styles.botaoSalvar : styles.botaoSalvarDis}>
          {salvando ? 'Salvando...' : 'Salvar Pedido'}
        </button>
      </div>

      {sugestao && (
        <div style={styles.avisoSugestao}>
          💡 Quantidades sugeridas com base no pedido do trimestre anterior. Edite conforme necessário.
        </div>
      )}

      {erro && <div style={styles.erroBox}>{erro}</div>}

      {/* TABELA DE REVISTAS */}
      <div style={styles.tabela}>
        <div style={styles.tabelaHeader}>
          <span style={{ width: '100px' }}>Código</span>
          <span style={{ flex: 3 }}>Nome da Revista</span>
          <span style={{ width: '80px' }}>Tipo</span>
          <span style={{ width: '120px', textAlign: 'right' }}>Preço Unit.</span>
          <span style={{ width: '120px', textAlign: 'center' }}>Quantidade</span>
          <span style={{ width: '130px', textAlign: 'right' }}>Subtotal</span>
        </div>

        {revistas.map(r => {
          const subtotal = r.quantidade * (r.preco || 0)
          return (
            <div key={r.revista.id} style={{
              ...styles.tabelaLinha,
              backgroundColor: r.quantidade > 0 ? '#f0f9ff' : '#fff'
            }}>
              <span style={{ width: '100px', fontWeight: '600', color: '#1a3a5c' }}>{r.revista.codigo}</span>
              <span style={{ flex: 3 }}>{r.revista.nome}</span>
              <span style={{ width: '80px' }}>
                <span style={styles.tagTipo}>{r.revista.tipos_revista?.codigo}</span>
              </span>
              <span style={{ width: '120px', textAlign: 'right', color: r.preco ? '#333' : '#dc2626', fontSize: '13px' }}>
                {r.preco ? `R$ ${Number(r.preco).toFixed(2).replace('.', ',')}` : '⚠ sem preço'}
              </span>
              <span style={{ width: '120px', textAlign: 'center' }}>
                <input
                  type="number"
                  min="0"
                  value={r.quantidade}
                  onChange={e => setQtd(r.revista.id, e.target.value)}
                  style={styles.inputQtd}
                />
              </span>
              <span style={{ width: '130px', textAlign: 'right', fontWeight: r.quantidade > 0 ? '700' : '400', color: r.quantidade > 0 ? '#1a3a5c' : '#bbb' }}>
                {r.quantidade > 0 ? `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* TOTAL */}
      <div style={styles.totalBox}>
        <div style={styles.totalLinha}>
          <span style={styles.totalLabel}>Total do pedido</span>
          <span style={styles.totalValor}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={styles.totalLinha}>
          <span style={styles.parcelaLabel}>Parcela 1 (50%)</span>
          <span style={styles.parcelaValor}>R$ {(total / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style={styles.totalLinha}>
          <span style={styles.parcelaLabel}>Parcela 2 (50%)</span>
          <span style={styles.parcelaValor}>R$ {(total / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  cabecalho: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' },
  botaoVoltar: { padding: '9px 16px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: '0 0 4px 0' },
  subtitulo: { fontSize: '13px', color: '#666', margin: 0 },
  botaoSalvar: { padding: '10px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', whiteSpace: 'nowrap' },
  botaoSalvarDis: { padding: '10px 24px', backgroundColor: '#d1d5db', color: '#999', border: 'none', borderRadius: '7px', cursor: 'not-allowed', fontSize: '15px', fontWeight: '600', whiteSpace: 'nowrap' },
  avisoSugestao: { backgroundColor: '#fef9c3', border: '1px solid #fde68a', borderRadius: '7px', padding: '10px 16px', fontSize: '13px', color: '#713f12', marginBottom: '16px' },
  erroBox: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '20px' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px', alignItems: 'center' },
  tabelaLinha: { display: 'flex', padding: '10px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px', transition: 'background 0.1s' },
  tagTipo: { backgroundColor: '#f0f4f8', color: '#444', fontSize: '12px', padding: '3px 10px', borderRadius: '20px' },
  inputQtd: { width: '80px', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', textAlign: 'center' },
  totalBox: { backgroundColor: '#fff', borderRadius: '10px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', maxWidth: '400px', marginLeft: 'auto' },
  totalLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  totalLabel: { fontSize: '16px', fontWeight: '700', color: '#1a3a5c' },
  totalValor: { fontSize: '22px', fontWeight: '700', color: '#1a3a5c' },
  parcelaLabel: { fontSize: '13px', color: '#888' },
  parcelaValor: { fontSize: '15px', color: '#555' },
}
