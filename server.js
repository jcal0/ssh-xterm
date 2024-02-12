const express = require('express');
const { Client } = require('ssh2');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));


// SSH connection configuration
const sshConfig = {
  host: 'ec2-54-210-234-102.compute-1.amazonaws.com',
  port: 22,
  username: 'ec2-user',
  privateKey: fs.readFileSync('./ec2-instance-key/keypair.pem')
  // Add privateKey or password here
};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');

  // Establish SSH connection
  const sshConnection = new Client();
  sshConnection.on('ready', () => {
    console.log('SSH connection established');

    // Execute SSH command
    sshConnection.shell((err, stream) => {
      if (err) {
        console.error('Error executing SSH command:', err);
        ws.send('Error executing SSH command');
        return;
      }

      // Handle incoming messages from the WebSocket client
      ws.on('message', (message) => {
        // console.log('Received message from client:', message);
        stream.write(message);
      });

      // Stream output of SSH command to WebSocket client
      stream.on('data', (data) => {
        // console.log('Received data from SSH server:', data.toString());
        ws.send(data.toString());
      });

      stream.stderr.on('data', (data) => {
        console.error('SSH command execution error:', data.toString());
        ws.send('Error executing SSH command');
      });

      stream.on('close', () => {
        console.log('SSH command execution completed');
        sshConnection.end(); // Close SSH connection
        ws.close();
      });
    });
  }).connect(sshConfig);

  // Handle WebSocket disconnection
  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });
});

// Start the server
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
