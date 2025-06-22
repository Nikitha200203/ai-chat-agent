from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chat_history = {}

class Message(BaseModel):
    user_id: str
    message: str

@app.post("/chat")
def chat(msg: Message):
    user_id = msg.user_id
    user_message = msg.message

    history = chat_history.get(user_id, [])

    history.append({"role": "user", "content": user_message})

    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": "You are a helpful and conversational AI assistant."},
            *history
        ]
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )
        result = response.json()
        reply = result["choices"][0]["message"]["content"]

        history.append({"role": "assistant", "content": reply})
        chat_history[user_id] = history

    except Exception as e:
        reply = f"Error: {str(e)}"
        history.append({"role": "assistant", "content": reply})

    return {
        "reply": reply,
        "history": history
    }
