export default function DisclaimerBox() {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #ddeaeb',
        borderLeft: '4px solid #17afaf',
        borderRadius: '10px',
        padding: '20px 24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span>ℹ️</span>
        <span
          style={{
            fontWeight: 700,
            color: '#0d4a4a',
            fontSize: '1rem',
            fontFamily: "'Playfair Display', serif",
          }}
        >
          About This Platform
        </span>
      </div>
      <p
        style={{
          color: '#5a7a7c',
          fontSize: '0.9rem',
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        HomeSalesReady is an information collation platform. We are not solicitors, estate agents or legal advisers, and nothing on this platform constitutes legal advice or opinion. Our purpose is to help you gather, organise and share the information and documents relevant to your property sale, creating a comprehensive digital property pack. HomeSalesReady was founded by property professionals who continue to work actively in the industry — so every feature has been shaped by genuine, hands-on experience of what sellers and agents actually need. All information you provide is self-declared. We recommend you seek independent legal advice from a qualified solicitor for all aspects of your property transaction.
      </p>
    </div>
  );
}
