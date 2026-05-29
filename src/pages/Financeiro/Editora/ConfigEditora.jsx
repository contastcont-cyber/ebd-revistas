import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ConfigEditora() {
  const [form, setForm] = useState({
    nome_cliente: '', endereco: '', codigo_local: 'GYN',
    forma_envio: 'TRANSPORTADORA', contato: '',
    cond_pagamento: 'BOLETO 3 X – 30 60 e 90', desconto_percentual: 50,
  })
  const [id, setId] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('config_editora').select('*').limit(1).single()
    if (data) { setForm(data); setId(data.id) }
  }

  async function salvar() {
    setSalvando(true)
    if (id) {
      await supabase.from('config_editora').update({ ...form, atualizado_em: new Date().toISOString() }).eq('id', id)
    } else {
      const { data } = await supabase.from('config_editora').insert(form).select().single()
      setId(data.id)
    }
    setSalvando(false)
    setMensagem('Configurações salvas!')
    setTimeout(() => setMensagem(''), 3000)
  }

  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))

  return (
    <div style={s.container}>
      <h2 style={s.titulo}>Configurações da Editora</h2>
      <p style={s.desc}>Esses dados aparecem no cabeçalho do pedido à editora.</p>
      {mensagem && <div style={s.sucesso}>{mensagem}</div>}

      <div style={s.card}>
        <h3 style={s.secao}>Dados do Cliente (sua instituição)</h3>
        <div style={s.campo}>
          <label style={s.label}>Nome do cliente</label>
          <input value={form.nome_cliente} onChange={e => f('nome_cliente', e.target.value)} style={s.input} placeholder="Ex: 12050 – IGREJA EVANGELICA ASSEMBLEIA DE DEUS – CAMPINAS GO" />
        </div>
        <div style={s.campo}>
          <label style={s.label}>Endereço</label>
          <input value={form.endereco} onChange={e => f('endereco', e.target.value)} style={s.input} placeholder="Ex: AV. SENADOR JAIME, 715 CEP 74.525-010 ST. CAMPINAS" />
        </div>
        <div style={s.grid3}>
          <div style={s.campo}>
            <label style={s.label}>Código / Filial</label>
            <input value={form.codigo_local} onChange={e => f('codigo_local', e.target.value)} style={s.input} placeholder="Ex: GYN" />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Forma de envio</label>
            <input value={form.forma_envio} onChange={e => f('forma_envio', e.target.value)} style={s.input} placeholder="TRANSPORTADORA" />
          </div>
        </div>
        <div style={s.campo}>
          <label style={s.label}>Contato na editora</label>
          <input value={form.contato} onChange={e => f('contato', e.target.value)} style={s.input} placeholder="Ex: Pr JOÃO NOGUEIRA – ZAP (62) 9 9104-6715" />
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.secao}>Condições Comerciais</h3>
        <div style={s.grid2}>
          <div style={s.campo}>
            <label style={s.label}>Condição de pagamento</label>
            <input value={form.cond_pagamento} onChange={e => f('cond_pagamento', e.target.value)} style={s.input} placeholder="BOLETO 3 X – 30 60 e 90" />
          </div>
          <div style={s.campo}>
            <label style={s.label}>Desconto padrão (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={form.desconto_percentual} onChange={e => f('desconto_percentual', parseFloat(e.target.value) || 0)} style={s.input} />
            <span style={s.hint}>Este desconto é aplicado ao subtotal do pedido e pode ser ajustado por pedido.</span>
          </div>
        </div>
      </div>

      <button onClick={salvar} disabled={salvando} style={s.botaoSalvar}>
        {salvando ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  )
}

const s = {
  container: { padding: '28px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', marginBottom: '6px' },
  desc: { fontSize: '13px', color: '#666', marginBottom: '24px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  card: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px' },
  secao: { fontSize: '15px', fontWeight: '700', color: '#1a3a5c', margin: '0 0 18px 0' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  campo: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  hint: { fontSize: '12px', color: '#888', marginTop: '4px', display: 'block', fontStyle: 'italic' },
  botaoSalvar: { padding: '10px 28px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
}
