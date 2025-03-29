from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if API key is available
api_key = os.getenv("API_KEY")
if not api_key:
    print("WARNING: API_KEY not found in environment variables")

# Configure GenAI
genai.configure(api_key=api_key)

# Initialize FastAPI app
app = FastAPI()

# Allow requests from all origins (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Route
@app.get("/")
def read_root():
    return {"message": "AI-DVSum Backend is Running!"}

# Pydantic model for request body
class VideoRequest(BaseModel):
    video_url: str

# Prompt for AI-generated summary
PROMPT = """
You are a YouTube video summarizer. I will give you the transcript text. 
You have to give me a summary with timestamps. Make sure to create a concise and accurate summary of each timestamp. 
For each major section or topic in the video, provide a timestamp and a brief summary (1-2 sentences).
Organize the summary in a clear, easy-to-read format with bullet points.
The transcript is as follows:
"""

# Extract transcript from YouTube video
def extract_transcript(url: str):
    try:
        # Extract YouTube video ID (works with various URL formats)
        if "watch?v=" in url:
            video_id = url.split("watch?v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[1].split("?")[0]
        else:
            raise ValueError("Invalid YouTube URL format")

        print(f"Attempting to get transcript for video ID: {video_id}")
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Include timestamp information
        formatted_transcript = ""
        for item in transcript_data:
            # Convert seconds to MM:SS format
            seconds = int(item["start"])
            minutes = seconds // 60
            seconds = seconds % 60
            timestamp = f"{minutes:02d}:{seconds:02d}"
            
            formatted_transcript += f"[{timestamp}] {item['text']} "
        
        if not formatted_transcript:
            raise ValueError("Empty transcript returned")

        print(f"Transcript length: {len(formatted_transcript)} characters")
        return formatted_transcript
    except Exception as e:
        print(f"Transcript extraction error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error extracting transcript: {str(e)}")

# Generate summary using Google Generative AI
def generate_content(transcript: str):
    try:
        print("Selecting appropriate Gemini model...")
        
        # Try using gemini-1.5-flash (current recommended model)
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            print("Using model: gemini-1.5-flash")
        except Exception as e:
            print(f"Error with gemini-1.5-flash: {str(e)}")
            # Fallback options
            fallback_models = [
                "gemini-1.5-pro", 
                "gemini-2.0-flash", 
                "gemini-1.5-flash-latest"
            ]
            
            for model_name in fallback_models:
                try:
                    print(f"Trying fallback model: {model_name}")
                    model = genai.GenerativeModel(model_name)
                    print(f"Using model: {model_name}")
                    break
                except Exception as e:
                    print(f"Error with {model_name}: {str(e)}")
            else:
                raise ValueError("Could not initialize any Gemini model")
        
        print("Sending transcript to Gemini model...")
        
        # Set generation parameters for better summaries
        generation_config = {
            "temperature": 0.2,  # Lower temperature for more factual, deterministic responses
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
        
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
        
        response = model.generate_content(
            PROMPT + transcript,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        if not response or not response.text:
            raise ValueError("Empty response from Gemini API")
            
        print(f"Generated summary length: {len(response.text)} characters")
        return response.text
    except Exception as e:
        print(f"Summary generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

# API Endpoint to summarize YouTube video
@app.post("/summarize")
async def summarize_video(request: VideoRequest):
    try:
        print(f"Received request for URL: {request.video_url}")
        transcript = extract_transcript(request.video_url)
        summary = generate_content(transcript)
        return {"summary": summary}
    except HTTPException as e:
        print(f"HTTPException: {e.detail}")
        raise e
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")