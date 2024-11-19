import client, { Channel, Connection } from 'amqplib';
import dotenv from 'dotenv';


dotenv.config();

// Config
const rmqUser = String(process.env.RABBITMQ_USERNAME);
const rmqPass = String(process.env.RABBITMQ_PASSWORD);
const rmqHost = String(process.env.RABBITMQ_URL);

// Interfaces
interface Doctor {
  name: string;
  time: string;
  type: string;
}

interface DoctorRequestProcessor {
  connect(): Promise<void>;
  processRequests(): Promise<void>;
}

class RabbitMQDoctorRequestProcessor implements DoctorRequestProcessor {
  private connection!: Connection;
  private channel!: Channel;
  private doctors: Doctor[][] = [
    [
      {
        name: "John Mathew",
        time: "07:30 AM",
        type: "ophthalmologist"
      },
      {
        name: "Roma Katherine",
        time: "04:30 PM",
        type: "general"
      }
    ]
  ];

  async connect() {
    try {
      console.log('🔌 Connecting to RabbitMQ Server');
      this.connection = await client.connect(
        `amqp://${rmqUser}:${rmqPass}@${rmqHost}:5672`
      );

      this.channel = await this.connection.createChannel();
      console.log('✅ RabbitMQ Connection Established');

      // Declare queues
      await this.channel.assertQueue('doctor-request', { durable: true });
      await this.channel.assertQueue('doctor-response', { durable: true });
    } catch (error) {
      console.error('❌ RabbitMQ Connection Failed:', error);
      throw error;
    }
  }

  async processRequests() {
    try {
      await this.connect();

      // Process hardcoded doctor data
      this.doctors.forEach(doctorGroup => {
        doctorGroup.forEach(doctor => {
          this.sendDoctorResponse(doctor);
        });
      });

      // Set up consumer to listen for dynamic requests
      await this.listenForDoctorRequests();
    } catch (error) {
      console.error('Error processing doctor requests:', error);
    }
  }

  private async sendDoctorResponse(doctor: Doctor) {
    try {
      // Send doctor information to response queue
      this.channel.sendToQueue(
        'doctor-response',
        Buffer.from(JSON.stringify(doctor))
      );
      console.log(`📨 Sent doctor response for ${doctor.name}`);
    } catch (error) {
      console.error(`Failed to send doctor response for ${doctor.name}:`, error);
    }
  }

  private async listenForDoctorRequests() {
    try {
      await this.channel.consume('doctor-request', async (msg) => {
        if (msg) {
          try {
            // Parse incoming request (if needed)
            const requestData = JSON.parse(msg.content.toString());
            console.log('Received doctor request:', requestData);

            // Find matching doctors based on request criteria
            const matchedDoctors = this.findMatchingDoctors(requestData);

            // Send matched doctors
            matchedDoctors.forEach(doctor => {
              this.sendDoctorResponse(doctor);
            });

            // Acknowledge the message
            this.channel.ack(msg);
          } catch (error) {
            console.error('Error processing doctor request:', error);
            this.channel.nack(msg);
          }
        }
      });

      console.log('🚀 Listening for doctor requests');
    } catch (error) {
      console.error('Error setting up doctor request listener:', error);
    }
  }

  private findMatchingDoctors(request: any): Doctor[] {
    // Implement your matching logic here
    // For now, return all doctors
    return this.doctors.flat();
  }

  // Method to add new doctors dynamically
  addDoctor(doctor: Doctor) {
    this.doctors[0].push(doctor);
  }
}

// Create and start the processor
const doctorRequestProcessor = new RabbitMQDoctorRequestProcessor();

// Start processing
const startProcessor = async () => {
  try {
    await doctorRequestProcessor.processRequests();
  } catch (error) {
    console.error('Failed to start doctor request processor:', error);
  }
};

startProcessor();

export default doctorRequestProcessor;