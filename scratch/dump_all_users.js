async function dumpAllUsers() {
  const res = await fetch('https://eldersea.tekao.fr/api/api/users');
  if (res.ok) {
    const users = await res.json();
    console.log("All users data:", JSON.stringify(users, null, 2));
  }
}
dumpAllUsers();
