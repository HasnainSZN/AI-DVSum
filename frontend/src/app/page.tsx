"use client";

import { useEffect, useState } from "react";
import { getBackendMessage } from "../../utils/api";


export default function Home() {
  const [message, setMessage] = useState<string>("Loading...");

  useEffect(() => {
    async function fetchMessage() {
      const data = await getBackendMessage();
      setMessage(data.message);
    }
    fetchMessage();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold">AI-DVSum</h1>
        <p className="mt-4 text-gray-700">{message}</p>
      </div>
    </div>
  );
}
