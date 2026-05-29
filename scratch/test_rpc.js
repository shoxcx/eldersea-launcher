import DiscordRPC from 'discord-rpc';
console.log('DiscordRPC loaded successfully:', typeof DiscordRPC, Object.keys(DiscordRPC || {}));
try {
  const client = new DiscordRPC.Client({ transport: 'ipc' });
  console.log('Client instantiated successfully');
  client.login({ clientId: '367827983903490050' })
    .then(() => console.log('Login promise resolved'))
    .catch(err => {
      console.log('Login caught error:', err.message);
    });
} catch (e) {
  console.error('Error during execution:', e);
}
// Keep alive for 3 seconds to see if it throws unhandled promise rejections
setTimeout(() => {
  console.log('Done testing.');
}, 3000);
