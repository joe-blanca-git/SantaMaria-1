import asyncio
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def main():
    client = genai.Client()
    for m in client.models.list():
        print(m.name)

if __name__ == "__main__":
    main()
