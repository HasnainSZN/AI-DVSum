"use client";

import React, { useState, useEffect } from "react";

// Define types
interface SummaryResponse {
  summary: string;
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [copyText, setCopyText] = useState<string>("Copy to Clipboard");
  const [videoThumbnail, setVideoThumbnail] = useState<string>("");

  // Fix hydration issues by only rendering client-side features after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Extract video ID and thumbnail when URL changes
  useEffect(() => {
    if (videoUrl && isMounted) {
      try {
        // Extract video ID
        let videoId = "";
        
        if (videoUrl.includes("watch?v=")) {
          videoId = videoUrl.split("watch?v=")[1].split("&")[0];
        } else if (videoUrl.includes("youtu.be/")) {
          videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        }
        
        if (videoId) {
          setVideoThumbnail(`https://img.youtube.com/vi/${videoId}/0.jpg`);
        } else {
          setVideoThumbnail("");
        }
      } catch (e) {
        console.error("Error extracting video ID:", e);
        setVideoThumbnail("");
      }
    } else {
      setVideoThumbnail("");
    }
  }, [videoUrl, isMounted]);

  // Function to call the backend API
  const getVideoSummary = async (url: string): Promise<string> => {
    const response = await fetch('http://localhost:8000/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_url: url }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to generate summary');
    }
    
    const data: SummaryResponse = await response.json();
    return data.summary;
  };

  const handleGenerateSummary = async (): Promise<void> => {
    // Reset states
    setError("");
    setSummary(null);
    setIsLoading(true);
    setCopyText("Copy to Clipboard");

    if (!videoUrl) {
      setError("Please enter a YouTube URL.");
      setIsLoading(false);
      return;
    }

    // Validate YouTube URL format
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
    if (!youtubeRegex.test(videoUrl)) {
      setError("Please enter a valid YouTube URL.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await getVideoSummary(videoUrl);
      setSummary(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again later.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (): void => {
    if (summary && isMounted) {
      navigator.clipboard.writeText(summary)
        .then(() => {
          setCopyText("Copied!");
          setTimeout(() => setCopyText("Copy to Clipboard"), 2000);
        })
        .catch(() => {
          setCopyText("Failed to copy");
        });
    }
  };

  // Format timestamps in summary text
  const formatSummaryLine = (line: string): JSX.Element => {
    // We'll manually highlight timestamps instead of using dangerouslySetInnerHTML
    const timestampRegex = /(\[\d+:\d+\]|\(\d+:\d+\))/g;
    const parts = line.split(timestampRegex);
    
    return (
      <p className={`mb-2 ${line.trim().startsWith('- ') ? 'ml-4' : ''}`}>
        {parts.map((part, i) => {
          if (part.match(timestampRegex)) {
            return <span key={i} className="text-blue-600 font-semibold">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="p-6 bg-white rounded-lg shadow-md w-full max-w-3xl">
        <div className="flex items-center justify-center mb-4">
          <h1 className="text-3xl font-bold text-center">AI-DVSum</h1>
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">v2.0</span>
        </div>
        
        <p className="text-gray-600 mb-6 text-center">
          Get AI-generated summaries with timestamps for any YouTube video
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
            className="p-3 border border-gray-300 rounded flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGenerateSummary();
            }}
          />
          <button
            onClick={handleGenerateSummary}
            disabled={isLoading}
            className={`${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-6 py-3 rounded font-semibold transition-colors`}
          >
            {isLoading ? 'Processing...' : 'Generate Summary'}
          </button>
        </div>

        {videoThumbnail && !summary && !isLoading && (
          <div className="mt-4 mb-4 flex justify-center">
            <img 
              src={videoThumbnail} 
              alt="Video thumbnail" 
              className="rounded-lg max-h-48 object-cover" 
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Extracting transcript and generating summary...</p>
            <p className="text-gray-600 text-sm mt-2">This may take up to 30 seconds for longer videos</p>
          </div>
        )}

        {summary && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Video Summary</h2>
              {isMounted && (
                <button
                  onClick={handleCopyToClipboard}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
                >
                  {copyText}
                </button>
              )}
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded max-h-96 overflow-y-auto">
              {summary.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {formatSummaryLine(line)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          AI-DVSum - Powered by Gemini AI • Fast video summaries with timestamps
        </div>
      </div>
    </main>
  );
}