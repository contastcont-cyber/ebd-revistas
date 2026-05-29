import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const NUMEROS = [
  { value: 1, label: 'I Trimestre (Jan–Mar)' },
  { value: 2, label: 'II Trimestre (Abr–Jun)' },
  { value: 3, label: 'III Trimestre (Jul–Set)' },
  { value: 4, label: 'IV Trimestre (Out–Dez)' },
]

const PERIODO_DESCRICAO = {
  1: 'Janeiro, Fevereiro e Março',
  2: 'Abril, Maio e Junho',
  3: 'Julho, Agosto e Setembro',
  4: 'Outubro, Novembro e Dezembro',
}

export default function Trimestres() {
  const [trimestres, setTrimestres] = useState([])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ ano: new Date().getFullYear(), numero: 1 })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(null) // id do trimestre para fechar

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('trimestres')
      .select('*')
      .order('ano', { ascending: false })
      .order('numero', { ascending: false })
    setTrimestres(data || [])
  }

  function abrirNovo() {
    // Sugere o próximo trimestre automaticamente
    const ultimo = trimestres[0]
    let ano = new Date().getFullYear()
    let numero = 1
    if (ultimo) {
      if (ultimo.numero === 4) { ano = ultimo.ano + 1; numero = 1 }
      else { ano = ultimo.ano; numero = ultimo.numero + 1 }
    }
    setForm({ ano, numero })
    setEditando('novo')
    setErro('')
  }

  async function salvar() {
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('trimestres').insert({
      ano: parseInt(form.ano),
      numero: parseInt(form.numero),
      periodo_descricao: PERIODO_DESCRICAO[form.numero],
      status: 'aberto',
    })

    if (error) {
      setErro(error.code === '23505' ? 'Esse trimestre já existe.' : 'Erro: ' + error.message)
      setSalvando(false)
      return
    }

    // Copia preços das revistas do trimestre anterior
    await copiarPrecos(parseInt(form.ano), parseInt(form.numero))

    setSalvando(false)
    setEditando(null)
    setMensagem('Trimestre criado! Preços copiados do trimestre anterior.')
    setTimeout(() => setMensagem(''), 4000)
    carregar()
  }

  async function copiarPrecos(ano, numero) {
    // Encontra trimestre anterior
    let anoAnt = ano, numAnt = numero - 1
    if (numAnt === 0) { anoAnt = ano - 1; numAnt = 4 }

    const { data: trimAnt } = await supabase
      .from('trimestres')
      .select('id')
      .eq('ano', anoAnt)
      .eq('numero', numAnt)
      .single()

    if (!trimAnt) return // sem trimestre anterior, não copia

    const { data: trimNovo } = await supabase
      .from('trimestres')
      .select('id')
      .eq('ano', ano)
      .eq('numero', numero)
      .single()

    if (!trimNovo) return

    const { data: precos } = await supabase
      .from('precos_revistas')
      .select('revista_id, preco_unitario')
      .eq('trimestre_id', trimAnt.id)

    if (precos && precos.length > 0) {
      await supabase.from('precos_revistas').insert(
        precos.map(p => ({
          revista_id: p.revista_id,
          trimestre_id: trimNovo.id,
          preco_unitario: p.preco_unitario,
        }))
      )
    }
  }

  async function fecharTrimestre(id) {
    await supabase.from('trimestres').update({ status: 'fechado' }).eq('id', id)
    setConfirmando(null)
    setMensagem('Trimestre fechado com sucesso.')
    setTimeout(() => setMensagem(''), 3000)
    carregar()
  }

  async function reabrirTrimestre(id) {
    await supabase.from('trimestres').update({ status: 'aberto' }).eq('id', id)
    setMensagem('Trimestre reaberto.')
    setTimeout(() => setMensagem(''), 3000)
    carregar()
  }

  const numeroLabel = (n) => ['I', 'II', 'III', 'IV'][n - 1]

  return (
    <div style={styles.container}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Gestão de Trimestres</h2>
        <button onClick={abrirNovo} style={styles.botaoNovo}>+ Novo Trimestre</button>
      </div>

      {mensagem && <div style={styles.sucesso}>{mensagem}</div>}

      {editando && (
        <div style={styles.formulario}>
          <h3 style={styles.formTitulo}>Novo Trimestre</h3>
          <p style={styles.formDesc}>
            Os preços das revistas serão copiados automaticamente do trimestre anterior e poderão ser editados se houver reajuste.
          </p>
          <div style={styles.grid2}>
            <div style={styles.campo}>
              <label style={styles.label}>Ano</label>
              <input
                type="number"
                value={form.ano}
                onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}
                style={styles.input}
                min="2020"
                max="2099"
              />
            </div>
            <div style={styles.campo}>
              <label style={styles.label}>Trimestre</label>
              <select
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: parseInt(e.target.value) }))}
                style={styles.select}
              >
                {NUMEROS.map(n => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
          </div>
          {erro && <p style={styles.erro}>{erro}</p>}
          <div style={styles.botoesForm}>
            <button onClick={() => setEditando(null)} style={styles.botaoCancelar}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={styles.botaoSalvar}>
              {salvando ? 'Criando...' : 'Criar Trimestre'}
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmação fechar */}
      {confirmando && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitulo}>Fechar Trimestre?</h3>
            <p style={styles.modalTexto}>
              Ao fechar o trimestre, ele ficará bloqueado para novos lançamentos.
              Você poderá reabri-lo se necessário.
            </p>
            <div style={styles.modalBotoes}>
              <button onClick={() => setConfirmando(null)} style={styles.botaoCancelar}>Cancelar</button>
              <button onClick={() => fecharTrimestre(confirmando)} style={styles.botaoFechar}>
                Sim, fechar trimestre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE TRIMESTRES */}
      <div style={styles.lista}>
        {trimestres.length === 0 && (
          <div style={styles.vazio}>Nenhum trimestre cadastrado. Crie o primeiro acima.</div>
        )}
        {trimestres.map(t => (
          <div key={t.id} style={styles.card}>
            <div style={styles.cardEsq}>
              <div style={styles.cardNumero}>
                <span style={styles.numRomano}>{numeroLabel(t.numero)}</span>
                <span style={styles.numAno}>{t.ano}</span>
              </div>
              <div>
                <div style={styles.cardTitulo}>
                  {numeroLabel(t.numero)} Trimestre de {t.ano}
                </div>
                <div style={styles.cardPeriodo}>{t.periodo_descricao}</div>
              </div>
            </div>
            <div style={styles.cardDir}>
              <span style={t.status === 'aberto' ? styles.badgeAberto : styles.badgeFechado}>
                {t.status === 'aberto' ? '● Aberto' : '■ Fechado'}
              </span>
              {t.status === 'aberto' ? (
                <button onClick={() => setConfirmando(t.id)} style={styles.botaoFecharCard}>
                  Fechar Trimestre
                </button>
              ) : (
                <button onClick={() => reabrirTrimestre(t.id)} style={styles.botaoReabrir}>
                  Reabrir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '28px' },
  cabecalho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  titulo: { fontSize: '22px', color: '#1a3a5c', margin: 0 },
  botaoNovo: { padding: '9px 20px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  sucesso: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '7px', marginBottom: '16px', fontSize: '14px' },
  formulario: { backgroundColor: '#fff', borderRadius: '10px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitulo: { fontSize: '17px', color: '#1a3a5c', margin: '0 0 8px 0' },
  formDesc: { fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: '1.5' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  campo: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', backgroundColor: '#fff' },
  erro: { color: '#dc2626', fontSize: '13px', marginBottom: '12px' },
  botoesForm: { display: 'flex', gap: '10px' },
  botaoCancelar: { padding: '9px 20px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  botaoSalvar: { padding: '9px 24px', backgroundColor: '#1a3a5c', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '420px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  modalTitulo: { fontSize: '18px', color: '#1a3a5c', marginBottom: '12px' },
  modalTexto: { fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '24px' },
  modalBotoes: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  botaoFechar: { padding: '9px 20px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px' },
  lista: { display: 'flex', flexDirection: 'column', gap: '12px' },
  vazio: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px', backgroundColor: '#fff', borderRadius: '10px' },
  card: { backgroundColor: '#fff', borderRadius: '10px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardEsq: { display: 'flex', alignItems: 'center', gap: '18px' },
  cardNumero: { backgroundColor: '#1a3a5c', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '56px' },
  numRomano: { color: '#fff', fontSize: '18px', fontWeight: '700', lineHeight: 1 },
  numAno: { color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '2px' },
  cardTitulo: { fontSize: '16px', fontWeight: '600', color: '#1a3a5c' },
  cardPeriodo: { fontSize: '13px', color: '#888', marginTop: '2px' },
  cardDir: { display: 'flex', alignItems: 'center', gap: '14px' },
  badgeAberto: { backgroundColor: '#d1fae5', color: '#065f46', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  badgeFechado: { backgroundColor: '#f3f4f6', color: '#6b7280', padding: '5px 14px', borderRadius: '20px', fontSize: '13px' },
  botaoFecharCard: { padding: '7px 16px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
  botaoReabrir: { padding: '7px 16px', backgroundColor: '#f0f4f8', color: '#1a3a5c', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' },
}
