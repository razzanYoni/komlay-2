import client, { Channel, Connection } from "amqplib";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Config
const rmqQueue = String(process.env.RABBITMQ_QUEUE);
const rmqBrokerQueue = String(process.env.BROKER_RESPONSE_QUEUE);
const brokerURL = String(process.env.BROKER_URL);

// Interfaces
interface Doctor {
  name: string;
  time: string;
  type: string;
}

interface DoctorResponse extends Doctor {
  request_id: string;
}

interface DoctorRequestProcessor {
  connect(): Promise<void>;
  processRequests(): Promise<void>;
}

class RabbitMQDoctorRequestProcessor implements DoctorRequestProcessor {
  private connection!: Connection;
  private channel!: Channel;
  private doctors: Doctor[] = [
    {
      name: "John Mathew",
      time: "07:30 AM",
      type: "ophthalmologist",
    },
    {
      name: "Roma Katherine",
      time: "04:30 PM",
      type: "general",
    },
    {
      name: "Michael Smith",
      time: "09:00 AM",
      type: "cardiologist",
    },
    {
      name: "Emily Davis",
      time: "02:00 PM",
      type: "general",
    },
  ];

  async connect() {
    try {
      console.log("🔌 Connecting to RabbitMQ Server");
      this.connection = await client.connect("amqp://localhost");

      this.channel = await this.connection.createChannel();
      console.log("✅ RabbitMQ Connection Established");

      // Declare queues
      await this.channel.assertQueue(rmqQueue, { durable: false });
      await this.channel.assertQueue(rmqBrokerQueue, { durable: false });

      // Subscribe to broker, so broker will wait
      try {
        const response = await axios.post<String[]>(brokerURL + "/subscribe", {
          name: "Pine Valley",
        });

        console.log(response.data);
      } catch (error) {
        console.error("Error fetching queues:", error);
      }
    } catch (error) {
      console.error("❌ RabbitMQ Connection Failed:", error);
      throw error;
    }
  }

  async processRequests() {
    try {
      await this.connect();

      // Set up consumer to listen for dynamic requests
      await this.listenForDoctorRequests();
    } catch (error) {
      console.error("Error processing doctor requests:", error);
    }
  }

  private async sendDoctorResponse(doctors: DoctorResponse[]) {
    try {
      // Send doctor information to response queue
      console.log(JSON.stringify(doctors));
      this.channel.sendToQueue(
        rmqBrokerQueue,
        Buffer.from(JSON.stringify(doctors))
      );
      console.log(
        `📨 Sent doctor responses: ${doctors.map((d) => d.name).join(", ")}`
      );
    } catch (error) {
      console.error("Failed to send doctor responses:", error);
    }
  }

  private async listenForDoctorRequests() {
    try {
      await this.channel.consume(rmqQueue, async (msg) => {
        if (msg) {
          try {
            // Parse incoming request
            const requestData = JSON.parse(msg.content.toString());
            console.log("Received doctor request:", requestData);

            // Find matching doctors based on request type
            const matchedDoctors = this.findMatchingDoctors(requestData);

            // Send matched doctors
            if (matchedDoctors.length > 0) {
              await this.sendDoctorResponse(matchedDoctors);
            } else {
              // Send no doctors found response
              this.channel.sendToQueue(
                rmqBrokerQueue,
                Buffer.from(JSON.stringify({}))
              );
            }

            // Acknowledge the message
            this.channel.ack(msg);
          } catch (error) {
            console.error("Error processing doctor request:", error);
            this.channel.nack(msg);
          }
        }
      });

      console.log("🚀 Listening for doctor requests");
    } catch (error) {
      console.error("Error setting up doctor request listener:", error);
    }
  }

  private findMatchingDoctors(request: {
    doctorType: number;
    request_id: string;
  }): DoctorResponse[] {
    // Mapping from doctor type string to integer
    const doctorTypeMap: { [key: number]: string } = {
      1: "general",
      2: "ophthalmologist",
      3: "cardiologist",
    };

    // Convert the integer doctorType to its corresponding string and make it lowercase
    const doctorTypeString = doctorTypeMap[request.doctorType];

    if (!doctorTypeString) {
      throw new Error(`Invalid doctorType: ${request.doctorType}`);
    }

    // Find doctors matching the specific type
    const _doctors = this.doctors.filter(
      (doctor) => doctor.type.toLowerCase() === doctorTypeString
    );

    // Map results and include request_id
    return _doctors.map((doctor) => ({
      ...doctor,
      request_id: request.request_id,
      hospital: "Pine Valley",
    }));
  }

  // Method to add new doctors dynamically
  addDoctor(doctor: Doctor) {
    this.doctors.push(doctor);
  }
}

// Create and start the processor
const doctorRequestProcessor = new RabbitMQDoctorRequestProcessor();

// Start processing
const startProcessor = async () => {
  try {
    await doctorRequestProcessor.processRequests();
  } catch (error) {
    console.error("Failed to start doctor request processor:", error);
  }
};

startProcessor();

export default doctorRequestProcessor;
