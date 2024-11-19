import pika
from flask import Flask, request, jsonify
import pika.connection
import json
import os
from dotenv import load_dotenv

load_dotenv()

class RabbitMQClient:
  def __init__(self, host="localhost"):
    self.host = host
    self.connection = None
    self.channel = None
    
  def connect(self):
    # Establish connection with RabbitMQ server
    if not self.connection or self.connection.is_closed:
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(self.host))
    # Establish connection to channel
    if not self.channel or self.channel.is_closed:
        self.channel = self.connection.channel()
        
  def publish_message(self, queue_name, message):
    # Publish message (stringified json)
    self.connect()
    self.channel.queue_declare(queue=queue_name)  # Declare the queue (idempotent)
    self.channel.basic_publish(exchange='', routing_key=queue_name, body=json.dumps(message))

  def consume_messages(self, queue_name, callback):
    self.connect()
    self.channel.queue_declare(queue=queue_name)
    self.channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
    print(f"Consuming messages from {queue_name}...")
    self.channel.start_consuming()

  def close(self):
    if self.channel and not self.channel.is_closed:
        self.channel.close()
    if self.connection and not self.connection.is_closed:
        self.connection.close()

app = Flask(__name__)

rabbitmq_client = RabbitMQClient()
PINEVALLEY = os.environ.get('PINEVALLEY_QUEUE')
GRANDOAK = os.environ.get('GRANDOAK_QUEUE')
BROKERRESPONSE = os.environ.get('BROKER_RESPONSE_QUEUE')

@app.route('/healthcare', methods=['GET'])
def healthcare_api():
    # Receive user data
    data = request.json
    # "doctorType": "value"
    
    # Send messages to hospital queues
    rabbitmq_client.publish_message(PINEVALLEY, data)
    # rabbitmq_client.publish_message(GRANDOAK, data)
    aggregated_data = []
    
    def callback(ch, method, properties, body):
        print(f"Received {body}")
        aggregated_data.append(body)
        print(aggregated_data)
      
    # Consume response from hospitals
    rabbitmq_client.consume_messages(BROKERRESPONSE, callback=callback)
    
    return aggregated_data
    
# TODO: buat callback jadi masukin data ke list, terus return list nya ke HTTP
# Jadi HTTP itu bakal ngelakuin:
# request dan diolah lalu dapet data
# data yang didapetin dimasukin ke list, yang bakal di return

if __name__ == '__main__':
    app.run(debug=True)