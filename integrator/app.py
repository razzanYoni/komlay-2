import pika
from flask import Flask, request, jsonify
import json
import os
from dotenv import load_dotenv
import threading
import uuid
import time

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

  def consume_messages(self, queue_name, request_id, message_list, timeout=10):
    self.connect()
    self.channel.queue_declare(queue=queue_name)
    
    start_time = time.time()
    
    def callback(ch, method, properties, body):
        response = json.loads(body)
        if response.get('request_id') == request_id:
            message_list.append(response)
            print(f"Received response: {response}, request_id: {request_id}")
    
    self.channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
    print(f"Waiting for response for request_id: {request_id}")
    while time.time() - start_time < timeout:
        self.channel.connection.process_data_events(time_limit=1)
        if message_list:  
            break
    
    self.channel.stop_consuming()

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
    # Generate a unique request id
    request_id = str(uuid.uuid4())

    data = request.json
    data['request_id'] = request_id

    # Publish data to RabbitMQ
    rabbitmq_client.publish_message(PINEVALLEY, data)
    rabbitmq_client.publish_message(GRANDOAK, data)

    message_list = [] 

    def consume_thread():
        rabbitmq_client.consume_messages(BROKERRESPONSE, request_id, message_list)

    thread = threading.Thread(target=consume_thread)
    thread.start()
    thread.join(timeout=10)

    aggregated_data = []
    for message in message_list:
        if request_id in message.values():
            aggregated_data.append(message)

    if aggregated_data:
        return jsonify({"request_id": request_id, "data": aggregated_data})
    else:
        return jsonify({"request_id": request_id, "data": "No data available"})

if __name__ == '__main__':
    app.run(debug=True)
