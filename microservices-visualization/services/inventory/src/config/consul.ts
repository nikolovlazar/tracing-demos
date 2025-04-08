import { networkInterfaces } from 'os';

const CONSUL_URL = process.env.CONSUL_HTTP_ADDR || 'http://consul:8500';
const SERVICE_NAME = 'inventory-service';
const SERVICE_ID = `${SERVICE_NAME}-${
  process.env.HOSTNAME || Math.random().toString(36).substring(7)
}`;
const SERVICE_PORT = Number(process.env.PORT) || 8081;

function getInternalIP(): string {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return '127.0.0.1';
}

export const registerWithConsul = async () => {
  try {
    const registration = {
      ID: SERVICE_ID,
      Name: SERVICE_NAME,
      Tags: ['inventory', 'stock-management', 'microservice'],
      Address: getInternalIP(),
      Port: SERVICE_PORT,
      Check: {
        HTTP: `http://${getInternalIP()}:${SERVICE_PORT}/health`,
        Interval: '10s',
        Timeout: '5s',
      },
      Meta: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    const response = await fetch(`${CONSUL_URL}/v1/agent/service/register`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registration),
    });

    if (!response.ok) {
      throw new Error(`Failed to register with Consul: ${response.statusText}`);
    }

    console.log(
      `Successfully registered ${SERVICE_NAME} with Consul (ID: ${SERVICE_ID})`
    );

    // Set up deregistration on process termination
    process.on('SIGTERM', deregisterFromConsul);
    process.on('SIGINT', deregisterFromConsul);
  } catch (error) {
    console.error(`Failed to register ${SERVICE_NAME} with Consul:`, error);
    throw error;
  }
};

const deregisterFromConsul = async () => {
  try {
    const response = await fetch(
      `${CONSUL_URL}/v1/agent/service/deregister/${SERVICE_ID}`,
      {
        method: 'PUT',
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to deregister from Consul: ${response.statusText}`
      );
    }

    console.log(`Successfully deregistered ${SERVICE_ID} from Consul`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to deregister from Consul:', error);
    process.exit(1);
  }
};
