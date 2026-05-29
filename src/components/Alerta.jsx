export default function Alerta({ titulo, mensagem, tipo = 'info', onConfirmar, onCancelar, textoBotao = 'OK' }) {
  const cores = {
    info:    { header: '#1a3a5c', icone: 'ℹ️' },
    aviso:   { header: '#b45309', icone: '⚠️' },
    erro:    { header: '#dc2626', icone: '🚫' },
    sucesso: { header: '#059669', icone: '✅' },
    perigo:  { header: '#dc2626', icone: '🗑️' },
  }
  const cor = cores[tipo] || cores.info

  return (
    <div style={styles.overlay}>
      <div style={styles.caixa}>
        <div style={{ ...styles.header, backgroundColor: cor.header }}>
          <span style={styles.icone}>{cor.icone}</span>
          <span style={styles.headerTitulo}>{titulo}</span>
        </div>
        <div style={styles.corpo}>
          <p style={styles.mensagem}>{mensagem}</p>
          <div style={styles.botoes}>
            {onCancelar && (
              <button onClick={onCancelar} style={styles.botaoCancelar}>Cancelar</button>
            )}
            <button
              onClick={onConfirmar}
              style={{ ...styles.botaoOk, backgroundColor: cor.header }}
            >
              {textoBotao}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  caixa: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '16px 22px',
  },
  icone: { fontSize: '20px' },
  headerTitulo: { color: '#fff', fontWeight: '700', fontSize: '16px' },
  corpo: { padding: '22px 24px' },
  mensagem: { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 22px 0' },
  botoes: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  botaoCancelar: {
    padding: '9px 20px', backgroundColor: '#e5e7eb',
    color: '#333', border: 'none', borderRadius: '7px',
    cursor: 'pointer', fontSize: '14px',
  },
  botaoOk: {
    padding: '9px 24px', color: '#fff',
    border: 'none', borderRadius: '7px',
    cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  },
}
