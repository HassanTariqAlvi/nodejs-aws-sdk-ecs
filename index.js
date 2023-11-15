const express = require('express');
const AWS = require('aws-sdk');
const axios = require('axios');
require('dotenv').config();


AWS.config.update({
  region: process.env.AWS_REGION, 
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


const ecs = new AWS.ECS({apiVersion: '2014-11-13'});

const app = express();
const port = 3000;

//ADED for 2nd task


app.use(express.json());

app.get('/task-metadata', async (req, res) => {
  try {
      const response = await axios.get('http://169.254.170.2/v2/metadata');
      return res.json(response.data);
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
});

app.post('/stop-task', async (req, res) => {
  try {
      const taskArn = req.body.taskArn;
      const cluster = req.body.cluster; // Make sure to pass the cluster name in the request

      await ecs.stopTask({ cluster, task: taskArn }).promise();

      return res.json({ message: 'Task stopped successfully' });
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
});
//ADED for 2nd task


function updateECSService(desiredCount) {
  const params = {
    cluster: 'DevClusterDI-Bot', 
    service: 'nginx-service', 
    desiredCount: desiredCount
  };

  ecs.updateService(params, function(err, data) {
    if (err) {
      console.error("Error", err);
    } else {
      console.log(`Service updated to ${desiredCount} tasks`, data);
    }
  });
}


app.get('/start', (req, res) => {
  updateECSService(3); 
  res.send('Task count increased to 3');
});


app.get('/end', (req, res) => {
  updateECSService(1); // 
  res.send('Task count decreased to 1');
});

// Start the server
app.listen(port, () => {
  console.log(`ECS API running on http://localhost:${port}`);
});
