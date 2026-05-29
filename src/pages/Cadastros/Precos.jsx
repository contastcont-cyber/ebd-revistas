import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Precos() {
  const [trimestres, setTrimestres] = useState([])
  const [revistas, setRevistas] = useState([])
  const [precos, setPrecos] = useState({}) // { revista_id: { id, preco_unitario } }
  const [trimestreSel, setTrimestreSel] = useState('')
  const [editando, setEditando] = useState({}) // { revista_id: valor_editado }
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => { carregarTrimestres() }, [])
  useEffect(() => { if (trimestreSel) carregarPrecos() }, [trimestreSel])

  async function carregarTrimestres() {
    const { data } = await supabase
      .from('trimestres')
      .select('*')
      .order('ano', { ascending: false })
      .order('numero', { ascending: false })
    setTrimestres(data || [])
    if (data && data.length > 0) {
      // seleciona o trimestre aberto mais recente por padrão
      const aberto = data.find(t => t.status === 'aberto') || data[0]
      setTrimestreSel(aberto.id)
    }
  }

  async function carregarPrecos() {
    const { data: revData } = await supabase
      .from('revistas')
      .select('*, tipos_revista(codigo, descricao)')
      .eq('ativo', true)
      .order('codigo')

    const { data: precosData } = await supabase
      .from('precos_revistas')
      .select('*')
      .eq('trimestre_id', trimestreSel)

    setRevistas(revData || [])

    const mapa = {}
    ;(precosData || []).forEach(p => {
      mapa[p.revista_id] = { id: p.id, preco_unitario: p.preco_unitario }
    })
    setPrecos(mapa)
    setEditando({})
  }

  function iniciarEdicao(revId) {
    const atual = precos[revId]?.preco_unitario || ''
    setEditando(e => ({ ...e, [revId]: String(atual) }))
  }

  function cancelarEdicao(revId) {
    setEditando(e => {
      const novo = { ...e }
      delete novo[revId]
      return novo
    })
  }

  async function salvarPreco(revId) {
    const valor = parseFloat(String(editando[revId]).replace(',', '.'))
    if (isNaN(valor) || valor < 0) return

    setSalvando(true)
    const existente = precos[revId]

    if (existente) {
      await supabase
        .from('precos_revistas')
        .update({ preco_unitario: valor })
        .eq('id', existente.id)
    } else {
      await supabase.from('precos_revistas').insert({
        revista_id: revId,
        trimestre_id: trimestreSel,
        preco_unitario: valor,
      })
    }

    setSalvando(false)
    cancelarEdicao(revId)
    setMensagem('Preço salvo!')
    setTimeout(() => setMensagem(''), 2000)
    carregarPrecos()
  }

  async function salvarTodos() {
    if (Object.keys(editando).length === 0) return
    setSalvando(true)

    for (const [revId, valor] of Object.entries(editando)) {
      const num = parseFloat(String(valor).replace(',', '.'))
      if (isNaN(num) || num < 0) continue
      const existente = precos[revId]
      if (existente) {
        await supabase.from('precos_revistas').update({ preco_unitario: num }).eq('id', existente.id)
      } else {
        await supabase.from('precos_revistas').insert({
          revista_id: revId,
          trimestre_id: trimestreSel,
          preco_unitario: num,
        })
      }
    }

    setSalvando(false)
    setMensagem('Todos os preços salvos!')
    setTimeout(() => setMensagem(''), 3000)
    carregarPrecos()
  }

  function editarTodos() {
    const novos = {}
    revistas.forEach(r => {
      novos[r.id] = String(precos[r.id]?.preco_unitario || '')
    })
    setEditando(novos)
  }

  const trimestreAtual = trimestres.find(t => t.id === trimestreSel)
  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]
  const semPreco = revistas.filter(r => !precos[r.id]).length
  const editandoAlgum = Object.keys(editando).length > 0

  return (
    <div style={styles.container}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Preços por Trimestre</h2>
        {editandoAlgum && (
          <button onClick={salvarTodos} disabled={salvando} style={styles.botaoSalvarTodos}>
            {salvando ? 'Salvando...' : '💾 Salvar todos'}
          </button>
        )}
        {!editandoAlgum && revistas.length > 0 && (
          <button onClick={editarTodos} style={styles.botaoEditarTodos}>
            Editar todos os preços
          </button>
        )}
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {trimestres.length === 0 ? (
        <div style={styles.aviso}>
          Nenhum trimestre cadastrado. Crie um trimestre primeiro no menu <strong>Trimestres</strong>.
        </div>
      ) : (
        <>
          <div style={styles.seletorBox}>
            <label style={styles.label}>Trimestre</label>
            <select
              value={trimestreSel}
              onChange={e => setTrimestreSel(e.target.value)}
              style={styles.select}
            >
              {trimestres.map(t => (
                <option key={t.id} value={t.id}>
                  {numeroLabel(t.numero)} Trimestre de {t.ano} — {t.periodo_descricao}
                  {t.status === 'fechado' ? ' (fechado)' : ''}
                </option>
              ))}
            </select>
            {trimestreAtual && (
              <span style={trimestreAtual.status === 'aberto' ? styles.badgeAberto : styles.badgeFechado}>
                {trimestreAtual.status === 'aberto' ? '● Aberto' : '■ Fechado'}
              </span>
            )}
          </div>

          {semPreco > 0 && (
            <div style={styles.avisoPreco}>
              ⚠️ <strong>{semPreco} revista{semPreco > 1 ? 's' : ''}</strong> sem preço cadastrado neste trimestre.
              Os pedidos não poderão ser calculados sem os preços.
            </div>
          )}

          <div style={styles.tabela}>
            <div style={styles.tabelaHeader}>
              <span style={{ width: '100px' }}>Código</span>
              <span style={{ flex: 3 }}>Nome da Revista</span>
              <span style={{ width: '100px' }}>Tipo</span>
              <span style={{ width: '140px', textAlign: 'right' }}>Preço Unitário</span>
              <span style={{ width: '100px' }}></span>
            </div>

            {revistas.length === 0 && (
              <div style={styles.vazio}>Nenhuma revista ativa cadastrada.</div>
            )}

            {revistas.map(r => {
              const preco = precos[r.id]
              const estaEditando = r.id in editando

              return (
                <div key={r.id} style={styles.tabelaLinha}>
                  <span style={{ width: '100px', fontWeight: '600', color: '#1a3a5c' }}>{r.codigo}</span>
                  <span style={{ flex: 3 }}>{r.nome}</span>
                  <span style={{ width: '100px' }}>
                    <span style={styles.tagTipo}>{r.tipos_revista?.codigo}</span>
                  </span>
                  <span style={{ width: '140px', textAlign: 'right' }}>
                    {estaEditando ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editando[r.id]}
                        onChange={e => setEditando(ed => ({ ...ed, [r.id]: e.target.value }))}
                        style={styles.inputPreco}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') salvarPreco(r.id)
                          if (e.key === 'Escape') cancelarEdicao(r.id)
                        }}
                      />
                    ) : preco ? (
                      <span style={styles.valorPreco}>
                        R$ {Number(preco.preco_unitario).toFixed(2).replace('.', ',')}
                      </span>
                    ) : (
                      <span style={styles.semPreco}>— sem preço —</span>
                    )}
                  </span>
                  <span style={{ width: '100px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    {estaEditando ? (
                      <>
                        <button onClick={() => salvarPreco(r.id)} disabled={salvando} style={styles.botaoOk}>✓</button>
                        <button onClick={() => cancelarEdicao(r.id)} style={styles.botaoX}>✕</button>
                      </>
                    ) : (
                      <button onClick={() => iniciarEdicao(r.id)} style={styles.botaoEditar}>
                        {preco ? 'Editar' : 'Definir'}
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          <p style={styles.dica}>
            💡 Dica: clique em "Editar todos os preços" para lançar tudo de uma vez e salvar com um único clique.
            Pressione Enter para confirmar cada linha ou Esc para cancelar.
          </p>
        </>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: 0 },
  botaoEditarTodos: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvarTodos: { padding: '9px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  aviso: { backgroundColor: '#f0f4f8', borderRadius: '10px', padding: '32px', textAlign: 'center', color: '#666', fontSize: '14px' },
  avisoPreco: { backgroundColor: '#fef9c3', border: '1px solid #fde68a', borderRadius: '7px', padding: '12px 16px', fontSize: '13px', color: '#713f12', marginBottom: '16px' },
  seletorBox: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' },
  select: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  badgeAberto: { backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeFechado: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap' },
  tabela: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '16px' },
  tabelaHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', color: '#555', textTransform: 'uppercase', gap: '12px', alignItems: 'center' },
  tabelaLinha: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #f0f0f0', alignItems: 'center', fontSize: '14px', gap: '12px' },
  tagTipo: { backgroundColor: '#f0f4f8', color: '#444', fontSize: '12px', padding: '3px 10px', borderRadius: '20px' },
  valorPreco: { fontWeight: '600', color: '#1a3a5c', fontSize: '15px' },
  semPreco: { color: '#dc2626', fontSize: '13px', fontStyle: 'italic' },
  inputPreco: { width: '110px', padding: '6px 10px', border: '2px solid #1a3a5c', borderRadius: '6px', fontSize: '14px', textAlign: 'right' },
  botaoEditar: { padding: '6px 14px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  botaoOk: { padding: '6px 12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  botaoX: { padding: '6px 12px', backgroundColor: '#e5e7eb', color: '#555', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
  dica: { fontSize: '12px', color: '#888', fontStyle: 'italic' },
}
