export async function GET() {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Auth disabled</title>
</head>
<body>
<script>
(function () {
  var data = { type: 'AUTH_ERROR', error: 'Platform account auth is disabled' };
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(data, '*');
  }
})();
</script>
<p>Platform account auth is disabled.</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
