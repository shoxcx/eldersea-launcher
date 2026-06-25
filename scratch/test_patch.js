async function testPatch() {
  const payload = {
    lastActive: new Date().toISOString()
  };
  console.log("Sending patch with payload:", payload);
  const response = await fetch('https://eldersea.tekao.fr/api/api/users/2', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log("Status:", response.status);
  const text = await response.text();
  console.log("Response:", text);
}
testPatch();
