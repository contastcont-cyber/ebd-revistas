import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import FormPedido from './FormPedido'

export default function Pedidos() {
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSel, setTrimestreSel] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [igrejasSemPedido, setIgrejasSemPedido] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [pedidoAberto, setPedidoAberto] = useState(null) // { igreja, pedido|null, modo }
  const [filtro, setFiltro] = useState('')
  const [mensagem, setMensagem] = useState('')

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
    const [{ data: pedData }, { data: igData }] = await Promise.all([
      supabase
        .from('pedidos_igrejas')
        .select('*, igrejas(codigo, nome, responsavel, telefone), itens_pedido(*, revistas(codigo, nome))')
        .eq('trimestre_id', trimestreSel)
        .order('igrejas(codigo)', { ascending: true }),
      supabase
        .from('igrejas')
        .select('*')
        .eq('ativo', true)
        .order('codigo'),
    ])

    const pedidosData = pedData || []
    const igrejas = igData || []
    const igrejasComPedido = new Set(pedidosData.map(p => p.igreja_id))
    const semPedido = igrejas.filter(ig => !igrejasComPedido.has(ig.id))

    setPedidos(pedidosData)
    setIgrejasSemPedido(semPedido)
    setCarregando(false)
  }

  function abrirNovoPedido(igreja) {
    setPedidoAberto({ igreja, pedido: null, modo: 'novo' })
  }

  function abrirEditarPedido(pedido) {
    setPedidoAberto({ igreja: pedido.igrejas, pedido, modo: 'editar' })
  }

  async function fecharFormulario(atualizar) {
    setPedidoAberto(null)
    if (atualizar) {
      setMensagem('Pedido salvo com sucesso!')
      setTimeout(() => setMensagem(''), 3000)
      await carregarPedidos()
    }
  }

  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]
  const trimestreAtual = trimestres.find(t => t.id === trimestreSel)

  const pedidosFiltrados = pedidos.filter(p => {
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return (
      String(p.igrejas?.codigo).includes(f) ||
      (p.igrejas?.nome || '').toLowerCase().includes(f)
    )
  })

  const semPedidoFiltradas = igrejasSemPedido.filter(ig => {
    if (!filtro) return true
    const f = filtro.toLowerCase()
    return String(ig.codigo).includes(f) || ig.nome.toLowerCase().includes(f)
  })

  const totalGeral = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0)

  if (pedidoAberto) {
    return (
      <FormPedido
        igreja={pedidoAberto.igreja}
        pedidoExistente={pedidoAberto.pedido}
        trimestre={trimestreAtual}
        trimestreSel={trimestreSel}
        onFechar={fecharFormulario}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Pedidos das Igrejas</h2>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {/* SELETOR DE TRIMESTRE */}
      {trimestres.length === 0 ? (
        <div style={styles.avisoVazio}>Nenhum trimestre cadastrado.</div>
      ) : (
        <div style={styles.seletorBox}>
          <label style={styles.label}>Trimestre</label>
          <select value={trimestreSel} onChange={e => setTrimestreSel(e.target.value)} style={styles.select}>
            {trimestres.map(t => (
              <option key={t.id} value={t.id}>
                {numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}
                {t.status === 'fechado' ? ' (fechado)' : ''}
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
          <div style={styles.resumoCard}>
            <span style={styles.resumoNum}>{pedidos.length}</span>
            <span style={styles.resumoLabel}>Pedidos lançados</span>
          </div>
          <div style={styles.resumoCard}>
            <span style={styles.resumoNum}>{igrejasSemPedido.length}</span>
            <span style={styles.resumoLabel}>Igrejas sem pedido</span>
          </div>
          <div style={styles.resumoCard}>
            <span style={styles.resumoNum}>R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span style={styles.resumoLabel}>Total do trimestre</span>
          </div>
        </div>
      )}

      {/* BUSCA */}
      <input
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        style={styles.busca}
        placeholder="Buscar por código ou nome da igreja..."
      />

      {carregando && <div style={styles.avisoVazio}>Carregando...</div>}

      {/* PEDIDOS LANÇADOS */}
      {!carregando && pedidosFiltrados.length > 0 && (
        <>
          <h3 style={styles.secaoTitulo}>Pedidos lançados ({pedidosFiltrados.length})</h3>
          <div style={styles.tabela}>
            <div style={styles.tabelaHeader}>
              <span style={{ width: '70px' }}>Código</span>
              <span style={{ flex: 3 }}>Igreja</span>
              <span style={{ flex: 2 }}>Revistas</span>
              <span style={{ width: '130px', textAlign: 'right' }}>Total</span>
              <span style={{ width: '80px' }}></span>
            </div>
            {pedidosFiltrados.map(p => (
              <div key={p.id} style={styles.tabelaLinha}>
                <span style={{ width: '70px', fontWeight: '600', color: '#1a3a5c' }}>{p.igrejas?.codigo}</span>
                <span style={{ flex: 3 }}>{p.igrejas?.nome}</span>
                <span style={{ flex: 2, fontSize: '12px', color: '#666' }}>
                  {(p.itens_pedido || []).filter(i => i.quantidade > 0).map(i => `${i.revistas?.codigo}: ${i.quantidade}`).join(' | ') || '—'}
                </span>
                <span style={{ width: '130px', textAlign: 'right', fontWeight: '600', color: '#1a3a5c' }}>
                  R$ {Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ width: '80px', textAlign: 'right' }}>
                  <button onClick={() => abrirEditarPedido(p)} style={styles.botaoEditar}>Editar</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* IGREJAS SEM PEDIDO */}
      {!carregando && semPedidoFiltradas.length > 0 && (
        <>
          <h3 style={{ ...styles.secaoTitulo, marginTop: '28px' }}>
            Igrejas sem pedido neste trimestre ({semPedidoFiltradas.length})
          </h3>
          <div style={styles.tabela}>
            <div style={styles.tabelaHeader}>
              <span style={{ width: '70px' }}>Código</span>
              <span style={{ flex: 3 }}>Igreja</span>
              <span style={{ flex: 2 }}>Responsável</span>
              <span style={{ width: '130px' }}></span>
            </div>
            {semPedidoFiltradas.map(ig => (
              <div key={ig.id} style={{ ...styles.tabelaLinha, opacity: 0.7 }}>
                <span style={{ width: '70px', fontWeight: '600', color: '#1a3a5c' }}>{ig.codigo}</span>
                <span style={{ flex: 3 }}>{ig.nome}</span>
                <span style={{ flex: 2, fontSize: '13px', color: '#666' }}>{ig.responsavel || '—'}</span>
                <span style={{ width: '130px', textAlign: 'right' }}>
                  <button onClick={() => abrirNovoPedido(ig)} style={styles.botaoNovoPedido}>
                    + Lançar Pedido
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {!carregando && pedidos.length === 0 && igrejasSemPedido.length === 0 && (
        <div style={styles.avisoVazio}>Nenhuma igreja ativa cadastrada.</div>
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
  resumoNum: { fontSize: '22px', fontWeight: '700', color: '#1a3a5c' },
  resumoLabel: { fontSize: '13px', color: '#888' },
  busca: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', marginBottom: '20px' },
  secaoTitulo: { fontSize: '15px', fontWeight: '700', color: '#444', marginBottom: '10px' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '8px' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px' },
  tabelaLinha: { display: 'flex', padding: '13px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px' },
  botaoEditar: { padding: '6px 14px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  botaoNovoPedido: { padding: '6px 14px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  avisoVazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px', backgroundColor: '#fff', borderRadius: '10px' },
}
