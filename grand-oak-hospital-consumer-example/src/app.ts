import amqp from 'amqplib';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DoctorTypeConsumer {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async connect() {
    try {
      // RabbitMQ connection parameters
      const rmqUser = String(process.env.RABBITMQ_USERNAME);
      const rmqPass = String(process.env.RABBITMQ_PASSWORD);
      const rmqHost = String(process.env.RABBITMQ_URL);

      // Establish connection
      this.connection = await amqp.connect(
        `amqp://${rmqUser}:${rmqPass}@${rmqHost}:5672`
      );

      // Create channel
      this.channel = await this.connection.createChannel();

      console.log('✅ Connected to RabbitMQ');

      // Assert queues
      await this.channel.assertQueue('doctor-request', { durable: true });
      await this.channel.assertQueue('doctor-response', { durable: true });

      return this;
    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw error;
    }
  }

  // Method to send a doctor type request
  async requestDoctorsByType(type: string) {
    if (!this.channel) {
      await this.connect();
    }

    try {
      // Send request to doctor-request queue
      this.channel!.sendToQueue(
        'doctor-request',
        Buffer.from(JSON.stringify({ type }))
      );
      console.log(`📤 Requesting doctors of type: ${type}`);
    } catch (error) {
      console.error('Error sending doctor request:', error);
    }
  }

  // Method to consume doctor responses
  async consumeDoctorResponses() {
    if (!this.channel) {
      await this.connect();
    }

    try {
      console.log('🔍 Waiting for doctor responses...');

      this.channel!.consume('doctor-response', (msg) => {
        if (msg) {
          try {
            // Parse the message content
            const responseData = JSON.parse(msg.content.toString());

            // Process the doctor response
            this.handleDoctorResponse(responseData);

            // Acknowledge the message
            this.channel!.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            // Negative acknowledge if there's an error
            this.channel!.nack(msg);
          }
        }
      });
    } catch (error) {
      console.error('Error consuming messages:', error);
    }
  }

  // Custom handler for doctor responses
  private handleDoctorResponse(responseData: any) {
    if (responseData.status === 'not_found') {
      console.log('❌ No doctors found:', responseData.message);
      return;
    }

    console.log('📬 Received Doctor Responses:');
    if (Array.isArray(responseData)) {
      responseData.forEach(doctor => {
        console.log('----------------------------');
        console.log('Name:', doctor.name);
        console.log('Time:', doctor.time);
        console.log('Type:', doctor.type);
      });
    } else {
      console.log('Unexpected response format:', responseData);
    }
  }
}

// Main execution function
async function runConsumer() {
  const consumer = new DoctorTypeConsumer();

  try {
    // Connect to RabbitMQ
    await consumer.connect();

    // Example of sending different type requests
    await consumer.requestDoctorsByType('general');
    await consumer.requestDoctorsByType('ophthalmologist');
    await consumer.requestDoctorsByType('cardiologist');

    // Start consuming responses
    await consumer.consumeDoctorResponses();

    // Keep the process running
    console.log('🏃 Consumer is running. Waiting for messages...');
  } catch (error) {
    console.error('Error in consumer:', error);
  }
}

// Run the consumer
runConsumer();

export default DoctorTypeConsumer;