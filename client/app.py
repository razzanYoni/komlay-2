import streamlit as st
import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

broker_url = os.getenv('BROKER_URL')

doctorType = {
    "General": 1,
    "Ophthalmologist": 2,
    "Cardiologist": 3
}


def main():
    st.title("Healthcare API Client")
    st.divider()

    st.subheader("API Request Configuration")
    # method = st.selectbox("HTTP Method", ["GET", "POST", "PUT", "DELETE"], index=0)
    selected_option = st.selectbox(
        "Choose doctor type:",
        ["General", "Ophthalmologist", "Cardiologist"],
        help="Click to select doctor type"
    )

    # if method != "GET":
    #     st.divider()
    #     st.subheader("Request Body (Key-Value Pairs)")

    #     if "body_input" not in st.session_state:
    #         st.session_state.body_input = {}

    #     key = st.text_input("Key")
    #     value = st.text_input("Value")

    #     if st.button("Add KV Pair"):
    #         st.session_state.body_input[key] = value
        
    #     st.write("Request Body:\n", st.session_state.body_input)

    #     if st.button("Clear Request Body"):
    #         st.session_state.body_input = {}

    if st.button("Send Request"):
        st.divider()
        st.subheader("Response")

        # if method == "GET":
        #     response = requests.get(url)
        # elif method == "POST":
        #     response = requests.post(url, json=st.session_state.body_input)
        # elif method == "PUT":
        #     response = requests.put(url, json=st.session_state.body_input)
        # elif method == "DELETE":
        #     response = requests.delete(url)
        option = {"doctorType": doctorType[selected_option]}
        response = requests.get(broker_url, json=json.dumps(option))

        st.write("Status Code:", response.status_code)
        st.write("Response Body:", response.json())


if __name__ == "__main__":
    main()
