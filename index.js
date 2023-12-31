const express = require('express');
const AWS = require('aws-sdk');
const axios = require('axios');
require('dotenv').config();

// env file should be there in docker, with empty variables-key
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


const ecs = new AWS.ECS({apiVersion: '2014-11-13'});
const app = express();
const port = 3000;

app.use(express.json());

// For Checking the cluster, during runtime -- verify
app.get('/task-metadata', async (req, res) => {
  try {
      const response = await axios.get('http://169.254.170.2/v2/metadata');
      return res.json(response.data);
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
});

// Should be called by DI-Bot Scraping-API with post request when it's done with Scraping 
// It will distroy the task in ECS Fargate in which this code be running
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

// It's only to test if we make a get request to this API, it'll destroy the Running Task in ECS Fargate
// by making a post request to /stop-task local API
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


// Update the ECS-Fargate Service Count 
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

// Increase Task-Count to 3
app.get('/start', (req, res) => {
  updateECSService(3);
  res.send('Task count increased to 3');
});

// Decrease Task-Count to 1
app.get('/end', (req, res) => {
  updateECSService(1); //
  res.send('Task count decreased to 1');
});

// Get the Current running  tasks

function getRunningTasksCount() {
  const params = {
    cluster: process.env.ECS_CLUSTER,
    services: [process.env.ECS_SERVICE],
  };

  ecs.describeServices(params, function(err, data) {
    if (err) {
      console.error("Error", err);
    } else {
      const runningCount = data.services[0].runningCount;
      console.log(`Currently running ${runningCount} tasks for service ${process.env.ECS_SERVICE}`);
    }
  });
}

app.get('/current-task', (req, res) => {
  getRunningTasksCount(); 
});

// Start the server
app.listen(port, () => {
  console.log(`ECS API running on http://localhost:${port}`);
});
