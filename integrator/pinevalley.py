import pika
import json
import os
from dotenv import load_dotenv

load_dotenv()

BROKER = os.environ.get('BROKER_RESPONSE_QUEUE')
PINEVALLEY = os.environ.get('PINEVALLEY_QUEUE')

def process_message(ch, method, properties, body):
    message = json.loads(body)
    print(f"Processing message: {message}")
    
    # Simulate processing and send response
    response = {"status": "success", "hospital": "Pine Valley"}
    send_response_to_queue(BROKER, response)

    ch.basic_ack(delivery_tag=method.delivery_tag)

def send_response_to_queue(queue_name, response):
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    channel.queue_declare(queue=queue_name)
    channel.basic_publish(exchange='', routing_key=queue_name, body=json.dumps(response))
    connection.close()

def start_hospital_service():
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    channel.queue_declare(queue=PINEVALLEY)
    channel.basic_consume(queue=PINEVALLEY, on_message_callback=process_message)
    print("Pine Valley Service is running...")
    channel.start_consuming()

if __name__ == '__main__':
    start_hospital_service()
