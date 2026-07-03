export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Ezra Bid Assistant API</h1>
      <p>Backend for the Ezra Bid Assistant Chrome Extension.</p>
      <ul>
        <li>
          <code>GET /api/health</code> — health check
        </li>
        <li>
          <code>POST /api/generate-bid</code> — generate a proposal
        </li>
      </ul>
    </main>
  );
}
