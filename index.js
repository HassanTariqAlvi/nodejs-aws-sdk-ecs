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
      // Fetch ECS task metadata
      const metadataResponse = await axios.get('http://169.254.170.2/v2/metadata');
      const taskMetadata = metadataResponse.data;

      // Extract the task ARN from metadata
      const taskArn = taskMetadata.TaskARN;

      // Extract the cluster name from the Cluster ARN
      const clusterArn = taskMetadata.Cluster;
      const clusterName = clusterArn.split(':')[5].split('/')[1];

      // Stop the task using ECS SDK
      await ecs.stopTask({ cluster: clusterName, task: taskArn }).promise();

      return res.json({ message: 'Task stopped successfully' });
  } catch (error) {
      console.error("Error stopping task: ", error);
      return res.status(500).json({ error: error.message });
  }
});


app.get('/end-myself', async (req, res) => {
  try {
    // Making a POST request to the /stop-task endpoint
    const stopTaskResponse = await axios.post('http://localhost:3000/stop-task');

    // Sending the response back to the client
    res.json(stopTaskResponse.data);
  } catch (error) {
    console.error("Error in ending self: ", error);
    res.status(500).json({ error: error.message });
  }
});


//ADED for 2nd task


  function updateECSService(desiredCount) {
   const params = {
    cluster: process.env.ECS_CLUSTER,
    service: process.env.ECS_SERVICE,
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
