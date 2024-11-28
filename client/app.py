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
    selected_option = st.selectbox(
        "Choose doctor type:",
        ["General", "Ophthalmologist", "Cardiologist"],
        help="Click to select doctor type"
    )

    if st.button("Send Request"):
        st.divider()
        st.subheader("Response")

        option = {"doctorType": doctorType[selected_option]}
        response = requests.get(broker_url, json=json.dumps(option))

        print(response)
        st.write("Status Code:", response.status_code)
        st.write("Response Body:", response.json())


if __name__ == "__main__":
    main()
