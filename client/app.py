import streamlit as st
import requests


def main():
    st.title("Healthcare API Client")
    st.divider()

    st.subheader("API Request Configuration")
    method = st.selectbox("HTTP Method", ["GET", "POST", "PUT", "DELETE"], index=0)
    url = st.text_input("Request URL", "")

    if method != "GET":
        st.divider()
        st.subheader("Request Body (Key-Value Pairs)")

        if "body_input" not in st.session_state:
            st.session_state.body_input = {}

        key = st.text_input("Key")
        value = st.text_input("Value")

        if st.button("Add KV Pair"):
            st.session_state.body_input[key] = value
        
        st.write("Request Body:\n", st.session_state.body_input)

        if st.button("Clear Request Body"):
            st.session_state.body_input = {}

    if st.button("Send Request"):
        st.divider()
        st.subheader("Response")

        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=st.session_state.body_input)
        elif method == "PUT":
            response = requests.put(url, json=st.session_state.body_input)
        elif method == "DELETE":
            response = requests.delete(url)

        st.write("Status Code:", response.status_code)
        st.write("Response Body:", response.json())


if __name__ == "__main__":
    main()
